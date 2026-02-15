import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        const token = parsed?.state?.token;
        
        if (token && typeof token === 'string' && token.length > 0) {
          // Ensure token doesn't have extra whitespace
          config.headers.Authorization = `Bearer ${token.trim()}`;
        }
      }
    } catch (error) {
      console.error('Error reading auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth and redirect to login
      console.warn('Authentication failed, clearing session');
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  firebaseLogin: (idToken) => api.post('/auth/firebase-login', { idToken }),
  firebaseRegister: (data) => api.post('/auth/firebase-register', data),
};

// User APIs
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getStats: () => api.get('/users/stats'),
};

// Question APIs
export const questionAPI = {
  getAll: (filters) => api.get('/questions', { params: filters }),
  getById: (id) => api.get(`/questions/${id}`),
  getRandom: (difficulty) => api.get(`/questions/random/${difficulty}`),
};

// Progress APIs
export const progressAPI = {
  submit: (data) => api.post('/progress/submit', data),
  getAll: () => api.get('/progress'),
  getAnalytics: () => api.get('/progress/analytics'),
};

// Sheets APIs
export const sheetsAPI = {
  getAll: (filters) => api.get('/sheets', { params: filters }),
  getBySlug: (slug) => api.get(`/sheets/${slug}`),
  toggleProgress: (slug, problemSlug) => api.post(`/sheets/${slug}/progress/toggle`, { problemSlug }),
  toggleRevision: (slug, problemSlug) => api.post(`/sheets/${slug}/revision/toggle`, { problemSlug }),
  saveNotes: (slug, problemSlug, notes) => api.post(`/sheets/${slug}/notes/save`, { problemSlug, notes }),
  getRandom: (slug) => api.get(`/sheets/${slug}/random`),
};

// AI Features APIs (Complete Integration)
export const aiAPI = {
  // Smart Roadmap
  generateRoadmap: (data) => api.post('/ai/roadmap/generate', data),
  getCurrentRoadmap: () => api.get('/ai/roadmap/current'),
  getTodayPlan: () => api.get('/ai/roadmap/today'),
  completeDayPlan: (dayNumber) => api.put(`/ai/roadmap/complete-day/${dayNumber}`),
  regenerateRoadmap: (roadmapId) => api.post(`/ai/roadmap/regenerate/${roadmapId}`),
  updateRoadmapStatus: (roadmapId, data) => api.put(`/ai/roadmap/status/${roadmapId}`, data),
  submitRoadmapFeedback: (roadmapId, data) => api.post(`/ai/roadmap/feedback/${roadmapId}`, data),
  getRoadmapHistory: () => api.get('/ai/roadmap/history'),

  // Adaptive Questions
  getNextQuestion: () => api.get('/ai/questions/next'),
  getRecommendations: (count = 10) => api.get('/ai/questions/recommendations', { params: { count } }),
  recordInteraction: (data) => api.post('/ai/questions/interaction', data),

  // Mistake Analysis
  analyzeMistake: (data) => api.post('/ai/mistakes/analyze', data),
  getMistakePatterns: () => api.get('/ai/mistakes/patterns'),

  // AI Question Generator (OpenAI)
  generateQuestion: (data) => api.post('/ai/questions/generate', data),

  // AI Feedback Engine (OpenAI)
  generateFeedback: (data) => api.post('/ai/feedback/generate', data),

  // Interview Readiness
  predictReadiness: (targetRole) => api.get(`/ai/readiness/${targetRole}`),

  // AI Study Companion (OpenAI)
  askCompanion: (data) => api.post('/ai/companion/ask', data),
};

// Interview APIs
export const interviewAPI = {
  getAll: () => api.get('/interviews'),
  schedule: (data) => api.post('/interviews/schedule', data),
  getById: (id) => api.get(`/interviews/${id}`),
  updateStatus: (id, status) => api.put(`/interviews/${id}/status`, { status }),
  uploadRecording: (id, data) => api.post(`/interviews/${id}/recording`, data),
  updateRubric: (id, data) => api.put(`/interviews/${id}/rubric`, data),
  cancel: (id) => api.delete(`/interviews/${id}`),
};

// Research Analytics APIs
export const researchAPI = {
  getLearningBehavior: () => api.get('/research/learning-behavior'),
  trackSession: (data) => api.post('/research/track-session', data),
  updateCognitiveLoad: (data) => api.put('/research/cognitive-load', data),
  getSkillMastery: () => api.get('/research/skill-mastery'),
  calibrateQuestion: (questionId, data) => api.post(`/research/calibrate-question/${questionId}`, data),
  getLongitudinalProgress: () => api.get('/research/longitudinal-progress'),
  exportData: () => api.get('/research/export'),
};

// ===========================
// NEW ADVANCED FEATURES APIs
// ===========================

// Collaboration API
export const collaborationAPI = {
  getSessions: () => api.get('/collaboration/sessions'),
  createSession: (data) => api.post('/collaboration/sessions', data),
  getSession: (id) => api.get(`/collaboration/sessions/${id}`),
  updateSession: (id, data) => api.put(`/collaboration/sessions/${id}`, data),
  deleteSession: (id) => api.delete(`/collaboration/sessions/${id}`),
  joinSession: (id) => api.post(`/collaboration/sessions/${id}/join`),
  leaveSession: (id) => api.post(`/collaboration/sessions/${id}/leave`),
  getActiveUsers: (id) => api.get(`/collaboration/sessions/${id}/active-users`),
};

// Gamification API
export const gamificationAPI = {
  getUserData: () => api.get('/gamification'),
  awardPoints: (points, reason) => api.post('/gamification/points', { points, reason }),
  getBadges: () => api.get('/gamification/badges'),
  getLeaderboard: (timeframe = 'weekly', limit = 10) => 
    api.get('/gamification/leaderboard', { params: { timeframe, limit } }),
  getChallenges: () => api.get('/gamification/challenges'),
  completeChallenge: (id) => api.post(`/gamification/challenges/${id}/complete`),
  getStats: () => api.get('/gamification/stats'),
};

// Resume API
export const resumeAPI = {
  // CRUD operations
  list: () => api.get('/resumes'),
  create: (data) => api.post('/resumes', data),
  get: (id) => api.get(`/resumes/${id}`),
  update: (id, data) => api.put(`/resumes/${id}`, data),
  delete: (id) => api.delete(`/resumes/${id}`),
  
  // AI enhancement functions
  enhanceBullet: (bullet) => api.post('/resumes/ai/enhance-bullet', { bullet }),
  generateSummary: (resumeData) => api.post('/resumes/ai/generate-summary', { resume: resumeData }),
  optimizeForJob: (id, jobDescription) => api.post(`/resumes/${id}/optimize`, { jobDescription }),
  generateProject: (projectData) => api.post('/resumes/ai/generate-project', { project: projectData }),
  extractSkills: (experienceData) => api.post('/resumes/ai/extract-skills', { experience: experienceData }),
  batchEnhance: (bullets) => api.post('/resumes/ai/batch-enhance', { bullets }),
  
  // Utility functions
  setPrimary: (id) => api.post(`/resumes/${id}/set-primary`),
  export: (id) => api.get(`/resumes/${id}/export`, { responseType: 'blob' }),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getReadiness: () => api.get('/analytics/readiness'),
  getTopicMastery: () => api.get('/analytics/topic-mastery'),
  getPerformance: () => api.get('/analytics/performance'),
  getTrends: (days = 30) => api.get('/analytics/trends', { params: { days } }),
  getStrengthsWeaknesses: () => api.get('/analytics/strengths-weaknesses'),
  getStudyPatterns: () => api.get('/analytics/study-patterns'),
  getPredictions: () => api.get('/analytics/predictions'),
  getComparison: () => api.get('/analytics/comparison'),
  createSnapshot: () => api.post('/analytics/snapshot'),
};

// Mock Interview API
export const mockInterviewAPI = {
  // Queue management
  joinQueue: (preferences) => api.post('/mock-interviews/queue/join', preferences),
  leaveQueue: () => api.post('/mock-interviews/queue/leave'),
  
  // Interview CRUD
  create: (data) => api.post('/mock-interviews/create', data),
  getUpcoming: () => api.get('/mock-interviews/upcoming'),
  getPast: () => api.get('/mock-interviews/past'),
  get: (id) => api.get(`/mock-interviews/${id}`),
  delete: (id) => api.delete(`/mock-interviews/${id}`),
  
  // Interview control
  start: (id) => api.post(`/mock-interviews/${id}/start`),
  end: (id) => api.post(`/mock-interviews/${id}/end`),
  switchRoles: (id) => api.post(`/mock-interviews/${id}/switch-roles`),
  
  // Feedback & notes
  submitFeedback: (id, feedback) => api.post(`/mock-interviews/${id}/feedback`, feedback),
  addNote: (id, note) => api.post(`/mock-interviews/${id}/notes`, { note }),
  
  // Statistics
  getStats: () => api.get('/mock-interviews/stats/me'),
};

// Job Matching API
export const jobAPI = {
  // Job analysis
  analyze: (jobData) => api.post('/jobs/analyze', jobData),
  import: (jobs) => api.post('/jobs/import', { jobs }),
  
  // Job discovery
  getRecommendations: (limit = 10) => api.get('/jobs/recommendations', { params: { limit } }),
  getTopMatches: (limit = 10) => api.get('/jobs/top-matches', { params: { limit } }),
  getSaved: () => api.get('/jobs/saved'),
  getApplied: () => api.get('/jobs/applied'),
  get: (id) => api.get(`/jobs/${id}`),
  
  // Job actions
  save: (id) => api.put(`/jobs/${id}/save`),
  apply: (id, appliedDate) => api.put(`/jobs/${id}/apply`, { appliedDate }),
  updateStatus: (id, status) => api.put(`/jobs/${id}/status`, { status }),
  updateNotes: (id, notes) => api.put(`/jobs/${id}/notes`, { notes }),
  delete: (id) => api.delete(`/jobs/${id}`),
};

export default api;
