/**
 * InterviewSessionStore (Zustand)
 *
 * Shared state for ALL interview modes:
 *   – VideoInterview
 *   – AsyncInterview
 *   – MockInterviewRoom
 *   – LiveInterviewSession
 *
 * This store is the single source of truth for an active interview session.
 * Components subscribe to the slice they need; heavy data (video blobs) is
 * stored in refs inside components to keep the store serialisable.
 */
import { create } from 'zustand';

const INITIAL_STATE = {
  // Session identity
  sessionId: null,
  interviewType: null,     // 'live' | 'async' | 'mock'
  targetRole: null,
  resumeId: null,
  userId: null,

  // Session lifecycle
  status: 'idle',          // 'idle' | 'connecting' | 'lobby' | 'active' | 'paused' | 'completed' | 'error'
  error: null,

  // Questions (loaded from backend on session start)
  questions: [],
  currentQuestionIndex: 0,

  // Answers accumulated during the session
  // [{ questionId, questionIndex, answerText, videoUrl, audioUrl, timestampStart, timestampEnd, duration, evaluation }]
  answers: [],

  // Real-time evaluation for the current question
  currentEvaluation: null,

  // Per-question timer state
  questionTimerSeconds: 0,
  questionTimerRunning: false,

  // Overall session timer
  sessionTimerSeconds: 0,

  // Devices
  videoEnabled: true,
  audioEnabled: true,
  screenSharing: false,

  // Final report
  reportId: null,
  finalSummary: null,
};

export const useInterviewSessionStore = create((set, get) => ({
  ...INITIAL_STATE,

  // ── Session lifecycle ────────────────────────────────────────────────────
  initSession({ sessionId, interviewType, targetRole, resumeId, userId, questions }) {
    set({
      sessionId,
      interviewType,
      targetRole,
      resumeId,
      userId,
      status: 'lobby',
      error: null,
      questions: questions || [],
      currentQuestionIndex: 0,
      answers: [],
      currentEvaluation: null,
      questionTimerSeconds: 0,
      questionTimerRunning: false,
      sessionTimerSeconds: 0,
      reportId: null,
      finalSummary: null,
    });
  },

  setStatus(status) {
    set({ status });
  },

  setError(error) {
    set({ error, status: 'error' });
  },

  clearError() {
    set({ error: null });
  },

  // ── Questions ────────────────────────────────────────────────────────────
  setQuestions(questions) {
    set({ questions });
  },

  goToNextQuestion() {
    const { currentQuestionIndex, questions } = get();
    if (currentQuestionIndex < questions.length - 1) {
      set({
        currentQuestionIndex: currentQuestionIndex + 1,
        currentEvaluation: null,
        questionTimerSeconds: 0,
        questionTimerRunning: true,
      });
    }
  },

  goToQuestion(index) {
    const { questions } = get();
    if (index >= 0 && index < questions.length) {
      set({
        currentQuestionIndex: index,
        currentEvaluation: null,
        questionTimerSeconds: 0,
        questionTimerRunning: true,
      });
    }
  },

  // ── Answers ──────────────────────────────────────────────────────────────
  saveAnswer({ questionId, questionIndex, answerText, videoUrl, audioUrl, timestampStart, timestampEnd, duration }) {
    set((state) => {
      const existingIdx = state.answers.findIndex((a) => a.questionIndex === questionIndex);
      const record = {
        questionId,
        questionIndex,
        answerText: answerText || '',
        videoUrl: videoUrl || null,
        audioUrl: audioUrl || null,
        timestampStart: timestampStart || Date.now(),
        timestampEnd: timestampEnd || Date.now(),
        duration: duration || 0,
        evaluation: null,
      };
      if (existingIdx >= 0) {
        const updated = [...state.answers];
        updated[existingIdx] = { ...updated[existingIdx], ...record };
        return { answers: updated };
      }
      return { answers: [...state.answers, record] };
    });
  },

  setAnswerEvaluation(questionIndex, evaluation) {
    set((state) => {
      const updated = state.answers.map((a) =>
        a.questionIndex === questionIndex ? { ...a, evaluation } : a
      );
      return { answers: updated, currentEvaluation: evaluation };
    });
  },

  // ── Timers ───────────────────────────────────────────────────────────────
  tickQuestionTimer() {
    set((state) =>
      state.questionTimerRunning
        ? { questionTimerSeconds: state.questionTimerSeconds + 1 }
        : {}
    );
  },

  tickSessionTimer() {
    set((state) =>
      state.status === 'active'
        ? { sessionTimerSeconds: state.sessionTimerSeconds + 1 }
        : {}
    );
  },

  setQuestionTimerRunning(running) {
    set({ questionTimerRunning: running });
  },

  resetQuestionTimer() {
    set({ questionTimerSeconds: 0, questionTimerRunning: false });
  },

  // ── Devices ──────────────────────────────────────────────────────────────
  toggleVideo() {
    set((state) => ({ videoEnabled: !state.videoEnabled }));
  },

  toggleAudio() {
    set((state) => ({ audioEnabled: !state.audioEnabled }));
  },

  setScreenSharing(sharing) {
    set({ screenSharing: sharing });
  },

  // ── Completion ───────────────────────────────────────────────────────────
  completeSession(payload = {}) {
    const { reportId = null, finalSummary = null } = payload;
  },

  // ── Reset ────────────────────────────────────────────────────────────────
  reset() {
    set(INITIAL_STATE);
  },
}));
