/**
 * useMockInterviewAI.js
 * Central React hook that manages the AI mock interview session lifecycle.
 * Works with MockInterviewRoom.jsx via a clean props/callback interface.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  fetchNextQuestion,
  fetchCodingProblem,
  fetchEvaluation,
  fetchSessionReport,
} from '../services/mockInterviewAI';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/* ─────────────────────────────────────────────────────────── */

export default function useMockInterviewAI({
  mockInterviewId,
  userId,
  interviewType = 'technical',
  difficulty: initialDifficulty = 'medium',
  resumeText = '',
  jobDescription = '',
}) {
  /* ── AI question queue ─────────────────────────────────── */
  const [questionQueue, setQuestionQueue] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);

  /* ── Answer state ──────────────────────────────────────── */
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);

  /* ── Evaluation state ──────────────────────────────────── */
  const [currentEvaluation, setCurrentEvaluation] = useState(null);
  const [evaluationComplete, setEvaluationComplete] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState(null);

  /* ── Turns (full history) ──────────────────────────────── */
  const [turns, setTurns] = useState([]);

  /* ── Coding problem ────────────────────────────────────── */
  const [codingProblem, setCodingProblem] = useState(null);
  const [codingProblems, setCodingProblems] = useState([]);

  /* ── Difficulty adaptation ─────────────────────────────── */
  const [currentDifficulty, setCurrentDifficulty] = useState(initialDifficulty);
  const recentScoresRef = useRef([]);

  /* ── AI speech ─────────────────────────────────────────── */
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [aiText, setAiText] = useState('');

  /* ── Voice / STT ───────────────────────────────────────── */
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  /* ── Loading / status ──────────────────────────────────── */
  const [isLoading, setIsLoading] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [finalReport, setFinalReport] = useState(null);
  const [sessionStartedAt] = useState(Date.now());
  const [speechError, setSpeechError] = useState(null);

  /* ── Socket ────────────────────────────────────────────── */
  const socketRef = useRef(null);
  const [recruiterPresent, setRecruiterPresent] = useState(false);
  const [liveRecruiterFeedback, setLiveRecruiterFeedback] = useState([]);

  /* ════════════════════════════════════════════════════════
     Socket connection
  ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!mockInterviewId || !userId) return;

    const socket = io(`${SOCKET_URL}/mock-interview`, {
      transports: ['websocket'],
      auth: { token: (() => { try { return JSON.parse(localStorage.getItem('auth-storage'))?.state?.token; } catch { return ''; } })() },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_room', { mockInterviewId, userId, role: 'candidate' });
    });

    socket.on('ai_question', ({ question }) => {
      setCurrentQuestion(question);
      setAnswerSubmitted(false);
      setEvaluationComplete(false);
      setCurrentEvaluation(null);
      setFollowUpQuestion(null);
      setCurrentAnswer('');
      speakText(question.questionText);
    });

    socket.on('answer_evaluated', ({ questionIndex: qi, evaluation, followUpQuestion: fq }) => {
      setCurrentEvaluation(evaluation);
      setEvaluationComplete(true);
      setFollowUpQuestion(fq);
      if (evaluation.overallScore != null) {
        recentScoresRef.current = [...recentScoresRef.current.slice(-2), evaluation.overallScore];
      }
    });

    socket.on('difficulty_updated', ({ nextDifficulty }) => {
      setCurrentDifficulty(nextDifficulty);
    });

    socket.on('recruiter_joined', () => setRecruiterPresent(true));
    socket.on('peer_left', ({ role }) => { if (role === 'recruiter') setRecruiterPresent(false); });

    socket.on('live_recruiter_feedback', (fb) => {
      setLiveRecruiterFeedback((prev) => [fb, ...prev].slice(0, 20));
    });

    socket.on('mock_interview_ended', () => {
      setSessionComplete(true);
    });

    socket.on('ai_error', ({ message }) => {
      console.error('[useMockInterviewAI] socket error:', message);
    });

    return () => {
      socket.disconnect();
    };
  }, [mockInterviewId, userId]);

  /* ════════════════════════════════════════════════════════
     Speech Synthesis (AI speaks question)
  ════════════════════════════════════════════════════════ */
  const speakText = useCallback((text) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = 1;
    utt.lang = 'en-US';

    // Try to pick a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex')
    );
    if (preferred) utt.voice = preferred;

    utt.onstart = () => { setIsAISpeaking(true); setAiText(text); };
    utt.onend = () => setIsAISpeaking(false);
    utt.onerror = () => setIsAISpeaking(false);

    window.speechSynthesis.speak(utt);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsAISpeaking(false);
  }, []);

  /* ════════════════════════════════════════════════════════
     Speech Recognition (candidate speaks answer)
  ════════════════════════════════════════════════════════ */
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSpeechError('Speech recognition is not supported in this browser. Please type your answer instead.');
      return;
    }

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t + ' ';
        else interim += t;
      }
      if (final) setTranscript((prev) => prev + final);
      setCurrentAnswer((prev) => prev + final + interim);
    };

    recognition.onerror = (e) => {
      console.warn('[STT] error:', e.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  /* ════════════════════════════════════════════════════════
     Request Next AI Question (HTTP fallback + socket)
  ════════════════════════════════════════════════════════ */
  const requestNextQuestion = useCallback(
    async (options = {}) => {
      if (!mockInterviewId) return;
      setIsLoading(true);
      try {
        const askedTexts = turns.map((t) => t.questionText);

        // Prefer socket (real-time) – emit and wait for 'ai_question' event
        if (socketRef.current?.connected) {
          socketRef.current.emit('request_ai_question', {
            mockInterviewId,
            difficulty: options.difficulty || currentDifficulty,
            askedQuestions: askedTexts,
            resumeText,
            jobDescription,
            skillGaps: options.skillGaps || [],
          });
        } else {
          // HTTP fallback
          const q = await fetchNextQuestion(mockInterviewId, {
            difficulty: options.difficulty || currentDifficulty,
            askedQuestions: askedTexts,
            resumeText,
            jobDescription,
          });
          setCurrentQuestion(q);
          setAnswerSubmitted(false);
          setEvaluationComplete(false);
          setCurrentEvaluation(null);
          setFollowUpQuestion(null);
          setCurrentAnswer('');
          speakText(q.questionText);
          setQuestionIndex((i) => i + 1);
        }
      } catch (err) {
        console.error('[useMockInterviewAI] requestNextQuestion error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [mockInterviewId, currentDifficulty, turns, resumeText, jobDescription, speakText]
  );

  /* ════════════════════════════════════════════════════════
     Request Coding Problem
  ════════════════════════════════════════════════════════ */
  const requestCodingProblem = useCallback(
    async (topics = []) => {
      if (!mockInterviewId) return;
      setIsLoading(true);
      try {
        const problem = await fetchCodingProblem(mockInterviewId, {
          difficulty: currentDifficulty,
          topics,
        });
        setCodingProblem(problem);
        speakText(`Here is your coding challenge: ${problem.title}. ${problem.description.slice(0, 120)}...`);
        return problem;
      } catch (err) {
        console.error('[useMockInterviewAI] requestCodingProblem error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [mockInterviewId, currentDifficulty, speakText]
  );

  /* ════════════════════════════════════════════════════════
     Submit Answer (evaluate + record turn)
  ════════════════════════════════════════════════════════ */
  const submitAnswer = useCallback(
    async (answerText, options = {}) => {
      if (!currentQuestion || !mockInterviewId) return;
      setAnswerSubmitted(true);
      setIsLoading(true);

      try {
        const answer = answerText || currentAnswer || transcript;

        if (socketRef.current?.connected) {
          // Real-time path via socket
          socketRef.current.emit('submit_answer', {
            mockInterviewId,
            questionText: currentQuestion.questionText,
            questionType: currentQuestion.questionType,
            answerText: answer,
            expectedTopics: currentQuestion.expectedTopics || [],
            questionIndex,
            difficulty: currentDifficulty,
            recentScores: recentScoresRef.current,
          });
        } else {
          // HTTP fallback
          const { evaluation, followUpQuestion: fq } = await fetchEvaluation(mockInterviewId, {
            questionText: currentQuestion.questionText,
            questionType: currentQuestion.questionType,
            answerText: answer,
            expectedTopics: currentQuestion.expectedTopics || [],
            generateFollowUpQ: true,
          });
          setCurrentEvaluation(evaluation);
          setEvaluationComplete(true);
          setFollowUpQuestion(fq);
          if (evaluation.overallScore != null) {
            recentScoresRef.current = [...recentScoresRef.current.slice(-2), evaluation.overallScore];
          }
          // Adapt difficulty locally
          const dims = ['easy', 'medium', 'hard', 'system_design'];
          const avg = recentScoresRef.current.reduce((a, b) => a + b, 0) / recentScoresRef.current.length;
          const idx = dims.indexOf(currentDifficulty);
          if (avg >= 8 && idx < dims.length - 1) setCurrentDifficulty(dims[idx + 1]);
          else if (avg <= 5 && idx > 0) setCurrentDifficulty(dims[idx - 1]);
        }

        // Save turn
        const turn = {
          questionId: `q-${questionIndex}`,
          questionText: currentQuestion.questionText,
          questionType: currentQuestion.questionType,
          difficulty: currentDifficulty,
          answerText: answer,
          transcript,
        };
        setTurns((prev) => [...prev, turn]);
        setQuestionIndex((i) => i + 1);
        setTranscript('');
      } catch (err) {
        console.error('[useMockInterviewAI] submitAnswer error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [currentQuestion, currentAnswer, transcript, questionIndex, currentDifficulty, mockInterviewId]
  );

  /* ═══════════════════════════════════════════════════════
     Submit Coding Solution
  ═══════════════════════════════════════════════════════ */
  const submitCodingSolution = useCallback(
    (code, passed = false) => {
      if (!codingProblem) return;
      const entry = { ...codingProblem, userCode: code, passed };
      setCodingProblems((prev) => [...prev, entry]);
      setCodingProblem(null);
      const msg = passed
        ? 'Great work! Your solution looks correct. Can you walk me through your approach and explain the time complexity?'
        : "That's a good attempt. What edge cases might trip up your solution?";
      speakText(msg);
    },
    [codingProblem, speakText]
  );

  /* ════════════════════════════════════════════════════════
     Complete Session + Generate Report
  ════════════════════════════════════════════════════════ */
  const completeSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const durationSeconds = Math.round((Date.now() - sessionStartedAt) / 1000);
      const report = await fetchSessionReport(mockInterviewId, {
        turns: turns.map((t, i) => ({
          ...t,
          evaluation: currentEvaluation && i === turns.length - 1 ? currentEvaluation : t.evaluation,
        })),
        codingProblems,
        durationSeconds,
      });
      setFinalReport(report);
      setSessionComplete(true);
      if (socketRef.current?.connected) {
        socketRef.current.emit('session_complete', { mockInterviewId });
      }
      speakText('Interview complete. Great job! Your detailed report is now ready.');
      return report;
    } catch (err) {
      console.error('[useMockInterviewAI] completeSession error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [mockInterviewId, turns, codingProblems, currentEvaluation, sessionStartedAt, speakText]);

  /* ════════════════════════════════════════════════════════
     Recruiter join helpers
  ════════════════════════════════════════════════════════ */
  const joinAsRecruiter = useCallback(({ userId: recruiterId }) => {
    socketRef.current?.emit('recruiter_join', { mockInterviewId, userId: recruiterId });
  }, [mockInterviewId]);

  const sendRecruiterFeedback = useCallback((comment, score) => {
    socketRef.current?.emit('recruiter_feedback', { mockInterviewId, comment, score });
  }, [mockInterviewId]);

  /* ════════════════════════════════════════════════════════
     Return
  ════════════════════════════════════════════════════════ */
  return {
    /* State */
    currentQuestion,
    questionIndex,
    currentAnswer,
    setCurrentAnswer,
    answerSubmitted,
    currentEvaluation,
    evaluationComplete,
    followUpQuestion,
    turns,
    currentDifficulty,
    codingProblem,
    codingProblems,
    isAISpeaking,
    aiText,
    isListening,
    transcript,
    isLoading,
    sessionComplete,
    finalReport,
    speechError,
    recruiterPresent,
    liveRecruiterFeedback,

    /* Actions */
    requestNextQuestion,
    requestCodingProblem,
    submitAnswer,
    submitCodingSolution,
    completeSession,
    speakText,
    stopSpeaking,
    startListening,
    stopListening,
    joinAsRecruiter,
    sendRecruiterFeedback,
  };
}
