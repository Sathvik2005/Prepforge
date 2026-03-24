/**
 * mockInterviewAI.js  – Frontend adapter for AI mock interview backend endpoints.
 * Only calls /api/mock-interviews/... routes. No dependency on other interview systems.
 */
import axios from 'axios';
import { mockInterviewAPI as base, interviewAPI } from './api';
import { API_BASE_URL } from '../utils/constants';

// Private axios instance (shares the same base URL + auth interceptor setup from api.js)
const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const token = JSON.parse(stored)?.state?.token;
      if (token) config.headers.Authorization = `Bearer ${token.trim()}`;
    }
  } catch {}
  return config;
});

/* ─── direct API helpers ─────────────────────────────────── */

/**
 * Ask the backend to generate the next AI question.
 * @param {string} sessionId
 * @param {object} ctx  { difficulty, askedQuestions, resumeText, jobDescription, skillGaps }
 */
export async function fetchNextQuestion(sessionId, ctx = {}) {
  const res = await api.post(`/mock-interviews/${sessionId}/ai/question`, ctx);
  return res.data?.data ?? res.data;
}

/**
 * Ask the backend to generate a coding problem.
 * @param {string} sessionId
 * @param {object} ctx  { difficulty, topics }
 */
export async function fetchCodingProblem(sessionId, ctx = {}) {
  const res = await api.post(`/mock-interviews/${sessionId}/ai/coding-problem`, ctx);
  return res.data?.data ?? res.data;
}

/**
 * Evaluate an answer via backend AI.
 * @param {string} sessionId
 * @param {object} ctx  { questionText, questionType, answerText, expectedTopics }
 * @returns { evaluation, followUpQuestion }
 */
export async function fetchEvaluation(sessionId, ctx = {}) {
  const res = await api.post(`/mock-interviews/${sessionId}/ai/evaluate`, ctx);
  return res.data?.data ?? res.data;
}

/**
 * Generate the final session report.
 * @param {string} sessionId
 * @param {object} payload  { turns, codingProblems, durationSeconds }
 */
export async function fetchSessionReport(sessionId, payload = {}) {
  const res = await api.post(`/mock-interviews/${sessionId}/report/generate`, payload);
  return res.data?.data ?? res.data;
}

/**
 * Load a saved report for a session.
 */
export async function loadReport(sessionId) {
  const res = await api.get(`/mock-interviews/${sessionId}/report`);
  return res.data?.data ?? res.data;
}

/**
 * Load the user's mock interview history.
 */
export async function loadHistory() {
  const res = await api.get('/mock-interviews/history/me');
  return res.data?.data ?? res.data;
}

/**
 * Create a new solo AI mock interview session.
 */
export async function createAISession({ type = 'technical', difficulty = 'medium', topics = [], duration = 45 } = {}) {
  const res = await base.create({ type, difficulty, topics, duration, scheduledTime: new Date() });
  return res.data?.data ?? res.data;
}

export default {
  fetchNextQuestion,
  fetchCodingProblem,
  fetchEvaluation,
  fetchSessionReport,
  loadReport,
  loadHistory,
  createAISession,
};
