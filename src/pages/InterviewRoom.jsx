import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, VideoOff, Mic, MicOff, SkipForward, Send,
  Clock, ChevronRight, AlertCircle, Loader2, CheckCircle2
} from 'lucide-react';
import { showError, showSuccess } from '../utils/toast';
import api from '../services/api';

const QUESTION_TIME = 120; // seconds per question

export default function InterviewRoom() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Media state
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [mediaReady, setMediaReady] = useState(false);

  // Interview state
  const [interview, setInterview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [phase, setPhase] = useState('setup'); // setup | loading | in-progress | submitting | done
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const timerRef = useRef(null);

  // ── fetch interview meta ──────────────────────────────────────
  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const res = await api.get(`/interviews/${id}`);
        setInterview(res.data);
      } catch {
        showError('Could not load interview details');
        navigate('/schedule-interview');
      }
    };
    fetchInterview();
  }, [id, navigate]);

  // ── request camera + mic ──────────────────────────────────────
  const requestMedia = useCallback(async () => {
    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
      setMicOn(true);
      setMediaReady(true);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setMediaError('Camera/microphone access was denied. You can still proceed and type your answers.');
      } else {
        setMediaError('Could not access camera/microphone. You can proceed without media.');
      }
      setMediaReady(true); // allow proceeding without camera
    }
  }, []);

  // ── toggle camera ─────────────────────────────────────────────
  const toggleCamera = () => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = !cameraOn;
    });
    setCameraOn((v) => !v);
  };

  // ── toggle mic ────────────────────────────────────────────────
  const toggleMic = () => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !micOn;
    });
    setMicOn((v) => !v);
  };

  // ── stop media on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
    };
  }, []);

  // ── countdown timer ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'in-progress') return;
    clearInterval(timerRef.current);
    setTimeLeft(questions[currentIdx]?.timeLimit ?? QUESTION_TIME);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSkip(true); // auto-skip on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase, currentIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── load questions ────────────────────────────────────────────
  const loadQuestions = async () => {
    setLoadingQuestions(true);
    setPhase('loading');
    try {
      const res = await api.get(`/interviews/${id}/questions`);
      const qs = res.data.questions || [];
      if (qs.length === 0) throw new Error('No questions returned');
      setQuestions(qs);
      setAnswers(qs.map(() => ({ answer: '', skipped: false })));
      setPhase('in-progress');
    } catch (err) {
      showError('Failed to load questions: ' + (err.response?.data?.message || err.message));
      setPhase('setup');
    } finally {
      setLoadingQuestions(false);
    }
  };

  // ── submit / skip ─────────────────────────────────────────────
  const handleSubmitAnswer = () => {
    clearInterval(timerRef.current);
    const updated = [...answers];
    updated[currentIdx] = { answer: currentAnswer.trim(), skipped: false };
    setAnswers(updated);
    setCurrentAnswer('');
    advanceQuestion(updated);
  };

  const handleSkip = useCallback((auto = false) => {
    clearInterval(timerRef.current);
    setAnswers((prev) => {
      const updated = [...prev];
      updated[currentIdx] = { answer: '', skipped: true };
      advanceQuestion(updated);
      return updated;
    });
    if (!auto) setCurrentAnswer('');
  }, [currentIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const advanceQuestion = (updatedAnswers) => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setCurrentAnswer('');
    } else {
      // All questions done — submit
      submitEvaluation(updatedAnswers);
    }
  };

  // ── final evaluation ──────────────────────────────────────────
  const submitEvaluation = async (finalAnswers) => {
    setPhase('submitting');
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());

    const payload = finalAnswers.map((a, i) => ({
      questionId: questions[i]?._id,
      question: questions[i]?.questionText,
      answer: a.answer,
      skipped: a.skipped,
    }));

    try {
      await api.post(`/interviews/${id}/evaluate`, { answers: payload });
      setPhase('done');
      showSuccess('Interview complete! Generating your report…');
      setTimeout(() => navigate(`/interview-report/${id}`), 1500);
    } catch (err) {
      showError('Failed to evaluate: ' + (err.response?.data?.message || err.message));
      setPhase('in-progress');
    }
  };

  // ── format timer ──────────────────────────────────────────────
  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const timerColor = timeLeft <= 30 ? 'text-red-400' : timeLeft <= 60 ? 'text-yellow-400' : 'text-green-400';

  // ──────────────────────────────────────────────────────────────
  // RENDER: setup screen
  // ──────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] pt-24 px-4 pb-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full glass rounded-3xl p-8"
        >
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Interview Room
          </h1>
          {interview && (
            <p className="text-center text-gray-400 mb-8 capitalize">
              {interview.type?.replace('-', ' ')} · {interview.mode} interview
            </p>
          )}

          {/* Camera preview */}
          <div className="relative bg-black rounded-2xl overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <VideoOff className="w-16 h-16 text-gray-600" />
              </div>
            )}
          </div>

          {/* Media error */}
          {mediaError && (
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-6">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-300 text-sm">{mediaError}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-4 mb-8">
            {!mediaReady ? (
              <button
                onClick={requestMedia}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors"
              >
                <Video className="w-5 h-5" /> Enable Camera & Mic
              </button>
            ) : (
              <>
                <button
                  onClick={toggleCamera}
                  className={`p-3 rounded-xl transition-colors ${cameraOn ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
                >
                  {cameraOn ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-gray-300" />}
                </button>
                <button
                  onClick={toggleMic}
                  className={`p-3 rounded-xl transition-colors ${micOn ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title={micOn ? 'Mute' : 'Unmute'}
                >
                  {micOn ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-gray-300" />}
                </button>
              </>
            )}
          </div>

          {/* Info */}
          <div className="space-y-3 mb-8 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              8 AI-generated questions tailored to your interview type
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              2-minute timer per question — skip any you find difficult
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Detailed AI report with score and feedback after completion
            </div>
          </div>

          <button
            onClick={mediaReady ? loadQuestions : requestMedia}
            disabled={loadingQuestions}
            className={`w-full py-4 rounded-xl font-semibold text-white text-lg flex items-center justify-center gap-2 transition-all
              ${mediaReady ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loadingQuestions ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Generating Questions…</>
            ) : mediaReady ? (
              <>Start Interview <ChevronRight className="w-5 h-5" /></>
            ) : (
              <>Enable Camera & Mic</>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── loading questions ─────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl font-semibold">Generating your questions…</p>
          <p className="text-gray-400 mt-2">AI is tailoring questions for your interview type</p>
        </div>
      </div>
    );
  }

  // ── submitting / done ─────────────────────────────────────────
  if (phase === 'submitting' || phase === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] flex items-center justify-center">
        <div className="text-center">
          {phase === 'submitting' ? (
            <>
              <Loader2 className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-white text-xl font-semibold">Evaluating your answers…</p>
              <p className="text-gray-400 mt-2">AI is reviewing each response</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-white text-xl font-semibold">Interview Complete!</p>
              <p className="text-gray-400 mt-2">Redirecting to your report…</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // RENDER: in-progress
  // ──────────────────────────────────────────────────────────────
  const question = questions[currentIdx];
  const progress = ((currentIdx) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] pt-20 px-4 pb-12">
      <div className="max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">Question</span>
            <span className="text-white font-bold">{currentIdx + 1}</span>
            <span className="text-gray-400 text-sm">of {questions.length}</span>
          </div>
          <div className={`flex items-center gap-2 font-mono font-bold text-xl ${timerColor}`}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            {cameraOn ? <Video className="w-4 h-4 text-blue-400" /> : <VideoOff className="w-4 h-4 text-gray-600" />}
            {micOn ? <Mic className="w-4 h-4 text-blue-400" /> : <MicOff className="w-4 h-4 text-gray-600" />}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/10 rounded-full mb-8">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Camera feed */}
          <div className="lg:col-span-1">
            <div className="relative bg-black rounded-2xl overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              {!cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <VideoOff className="w-10 h-10 text-gray-600" />
                </div>
              )}
              <div className="absolute bottom-2 left-2 flex gap-2">
                <button
                  onClick={toggleCamera}
                  className={`p-1.5 rounded-lg text-xs ${cameraOn ? 'bg-blue-600' : 'bg-gray-700'}`}
                >
                  {cameraOn ? <Video className="w-3.5 h-3.5 text-white" /> : <VideoOff className="w-3.5 h-3.5 text-gray-300" />}
                </button>
                <button
                  onClick={toggleMic}
                  className={`p-1.5 rounded-lg ${micOn ? 'bg-blue-600' : 'bg-gray-700'}`}
                >
                  {micOn ? <Mic className="w-3.5 h-3.5 text-white" /> : <MicOff className="w-3.5 h-3.5 text-gray-300" />}
                </button>
              </div>
            </div>

            {/* Answered dots */}
            <div className="glass rounded-xl p-3">
              <p className="text-gray-400 text-xs mb-2">Progress</p>
              <div className="flex flex-wrap gap-1.5">
                {questions.map((_, i) => {
                  const ans = answers[i];
                  const isCurrent = i === currentIdx;
                  const isDone = ans && (ans.answer || ans.skipped);
                  return (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${isCurrent ? 'bg-blue-500 text-white ring-2 ring-blue-300' :
                          isDone ? (ans.skipped ? 'bg-gray-600 text-gray-300' : 'bg-green-600 text-white') :
                          'bg-white/10 text-gray-500'}`}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Question + answer */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIdx}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
                className="glass rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize
                    ${question?.questionType === 'coding' ? 'bg-purple-500/20 text-purple-300' :
                      question?.questionType === 'behavioral' ? 'bg-green-500/20 text-green-300' :
                      question?.questionType === 'system-design' ? 'bg-orange-500/20 text-orange-300' :
                      'bg-blue-500/20 text-blue-300'}`}
                  >
                    {question?.questionType || 'technical'}
                  </span>
                </div>
                <h2 className="text-white text-xl font-semibold leading-relaxed">
                  {question?.questionText}
                </h2>
              </motion.div>
            </AnimatePresence>

            <div className="glass rounded-2xl p-6 flex flex-col gap-4 flex-1">
              <label className="text-gray-400 text-sm">Your Answer</label>
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer here… (or click Skip)"
                rows={8}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => handleSkip()}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip
                </button>
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!currentAnswer.trim()}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {currentIdx === questions.length - 1 ? 'Submit & Finish' : 'Submit & Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
