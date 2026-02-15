import apiClient from '../config/axios';
import { io } from 'socket.io-client';

const BACKEND_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// Create roadmap-specific client that extends the base client
const roadmapClient = {
  post: (url, data) => apiClient.post(`/roadmap${url}`, data),
  get: (url) => apiClient.get(`/roadmap${url}`),
  patch: (url, data) => apiClient.patch(`/roadmap${url}`, data),
  put: (url, data) => apiClient.put(`/roadmap${url}`, data),
  delete: (url) => apiClient.delete(`/roadmap${url}`),
};

// Note: Retry logic and auth are handled by the centralized apiClient

// Socket.IO singleton connection
let socket = null;
let connectionListeners = [];

/**
 * Initialize Socket.IO connection to backend
 * @param {string} userId - Current user ID
 * @returns {Socket} Socket.IO instance
 */
export const initSocketConnection = (userId) => {
  if (socket && socket.connected) {
    return socket;
  }
  
  socket = io(BACKEND_BASE_URL, {
    auth: { userId },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });
  
  socket.on('connect', () => {
    console.log('[RoadmapAPI] Socket connected:', socket.id);
    connectionListeners.forEach(cb => cb('connected'));
  });
  
  socket.on('disconnect', (reason) => {
    console.log('[RoadmapAPI] Socket disconnected:', reason);
    connectionListeners.forEach(cb => cb('disconnected', reason));
  });
  
  socket.on('connect_error', (error) => {
    console.error('[RoadmapAPI] Socket connection error:', error);
    connectionListeners.forEach(cb => cb('error', error));
  });
  
  return socket;
};

/**
 * Subscribe to Socket.IO events for a specific roadmap
 * @param {string} roadmapId - Roadmap ID to subscribe to
 * @param {Object} handlers - Event handlers { onUpdate, onProgress }
 */
export const subscribeToRoadmapEvents = (roadmapId, handlers) => {
  if (!socket) {
    console.warn('[RoadmapAPI] Socket not initialized. Call initSocketConnection first.');
    return () => {};
  }
  
  // Join room for this roadmap
  socket.emit('roadmap:subscribe', { roadmapId });
  
  // Subscribe to events
  const updateHandler = (data) => {
    if (data.roadmapId === roadmapId && handlers.onUpdate) {
      handlers.onUpdate(data.diff);
    }
  };
  
  const progressHandler = (data) => {
    if (data.roadmapId === roadmapId && handlers.onProgress) {
      handlers.onProgress(data.milestonesUpdated);
    }
  };
  
  socket.on('roadmap:update', updateHandler);
  socket.on('roadmap:progress', progressHandler);
  
  // Return cleanup function
  return () => {
    socket.off('roadmap:update', updateHandler);
    socket.off('roadmap:progress', progressHandler);
    socket.emit('roadmap:unsubscribe', { roadmapId });
  };
};

/**
 * Add connection status listener
 * @param {Function} callback - (status, error?) => void
 */
export const onConnectionChange = (callback) => {
  connectionListeners.push(callback);
  return () => {
    connectionListeners = connectionListeners.filter(cb => cb !== callback);
  };
};

/**
 * Disconnect Socket.IO
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    connectionListeners = [];
  }
};

// ===== REST API Methods =====

/**
 * Generate a new roadmap
 * @param {Object} payload - Generation request
 * @returns {Promise<{roadmapId: string, summary: Object}>}
 */
export const generateRoadmap = async (payload) => {
  try {
    console.log('🚀 Generating roadmap with payload:', {
      goal: payload.goal,
      currentLevel: payload.currentLevel,
      hasJobDescription: !!payload.jobDescription,
      timeframe: payload.timeframe
    });
    
    const response = await roadmapClient.post('/generate', payload);
    
    console.log('✅ Roadmap generated:', {
      roadmapId: response.data.roadmapId,
      provider: response.data.metadata?.provider
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Roadmap generation failed:', error.response?.data || error.message);
    throw formatError(error, 'Failed to generate roadmap');
  }
};

/**
 * Get roadmap by ID
 * @param {string} roadmapId - Roadmap ID
 * @returns {Promise<Object>} Full roadmap document
 */
export const getRoadmap = async (roadmapId) => {
  try {
    const response = await roadmapClient.get(`/${roadmapId}`);
    return response.data;
  } catch (error) {
    throw formatError(error, 'Failed to fetch roadmap');
  }
};

/**
 * Update milestone
 * @param {string} roadmapId - Roadmap ID
 * @param {string} milestoneId - Milestone ID
 * @param {Object} update - { action: 'complete'|'update'|'reschedule', payload: {...} }
 * @returns {Promise<Object>} Updated roadmap
 */
export const updateMilestone = async (roadmapId, milestoneId, update) => {
  try {
    const response = await roadmapClient.patch(`/${roadmapId}/milestone/${milestoneId}`, update);
    return response.data;
  } catch (error) {
    throw formatError(error, 'Failed to update milestone');
  }
};

/**
 * Get roadmap provenance
 * @param {string} roadmapId - Roadmap ID
 * @returns {Promise<Object>} Provenance data
 */
export const getRoadmapProvenance = async (roadmapId) => {
  try {
    const response = await roadmapClient.get(`/${roadmapId}/provenance`);
    return response.data;
  } catch (error) {
    throw formatError(error, 'Failed to fetch provenance');
  }
};

/**
 * Export roadmap to PDF
 * @param {string} roadmapId - Roadmap ID
 * @param {string} format - Export format (default: 'pdf')
 * @returns {Promise<Blob>} PDF file blob
 */
export const exportRoadmap = async (roadmapId, format = 'pdf') => {
  try {
    // For blob responses, use apiClient directly with full path
    const response = await apiClient.post(`/roadmap/${roadmapId}/export`, 
      { format },
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    throw formatError(error, 'Failed to export roadmap');
  }
};

/**
 * Get user's roadmaps list
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of roadmaps
 */
export const getUserRoadmaps = async (userId) => {
  try {
    const response = await roadmapClient.get(`/user/${userId}`);
    return response.data;
  } catch (error) {
    throw formatError(error, 'Failed to fetch user roadmaps');
  }
};

/**
 * Delete roadmap
 * @param {string} roadmapId - Roadmap ID
 * @returns {Promise<void>}
 */
export const deleteRoadmap = async (roadmapId) => {
  try {
    await roadmapClient.delete(`/${roadmapId}`);
  } catch (error) {
    throw formatError(error, 'Failed to delete roadmap');
  }
};

// ===== Helper Functions =====

/**
 * Format error for user-friendly display
 * @param {Error} error - Axios error
 * @param {string} defaultMessage - Default message
 * @returns {Error} Formatted error
 */
const formatError = (error, defaultMessage) => {
  if (error.response) {
    // Server responded with error
    const data = error.response.data;
    const message = data?.message || data?.error || defaultMessage;
    const formattedError = new Error(message);
    formattedError.status = error.response.status;
    formattedError.details = data;
    return formattedError;
  } else if (error.request) {
    // No response received
    const formattedError = new Error('Network error. Please check your connection.');
    formattedError.status = 0;
    return formattedError;
  } else {
    // Request setup error
    return new Error(error.message || defaultMessage);
  }
};

/**
 * Validate generation payload
 * @param {Object} payload - Generation request
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateGenerationPayload = (payload) => {
  const errors = [];
  
  // Backend expects these fields
  if (!payload.goal || payload.goal.trim().length === 0) {
    errors.push('Learning goal / target role is required');
  }
  
  if (!payload.currentLevel || !['beginner', 'novice', 'intermediate', 'advanced'].includes(payload.currentLevel.toLowerCase())) {
    errors.push('Current level must be one of: Beginner, Intermediate, Advanced');
  }
  
  if (!payload.timeframe || !payload.timeframe.value || !payload.timeframe.unit) {
    errors.push('Timeframe is required');
  } else if (payload.timeframe.value <= 0) {
    errors.push('Timeframe must be greater than 0');
  }
  
  // Optional but validate if provided
  if (payload.skills && !Array.isArray(payload.skills)) {
    errors.push('Skills must be an array');
  }
  
  if (payload.preferredTopics && !Array.isArray(payload.preferredTopics)) {
    errors.push('Preferred topics must be an array');
  }
  
  // Sanity check: estimate if timeline is realistic
  if (payload.timeframe) {
    const totalWeeks = payload.timeframe.unit === 'months' 
      ? payload.timeframe.value * 4 
      : payload.timeframe.value;
    
    if (totalWeeks < 2) {
      errors.push(`Timeline of ${payload.timeframe.value} ${payload.timeframe.unit} is too short for meaningful learning. Consider at least 2 weeks.`);
    } else if (totalWeeks > 104) { // 2 years
      errors.push(`Timeline of ${payload.timeframe.value} ${payload.timeframe.unit} is very long. Consider breaking it into smaller roadmaps.`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Calculate feasibility score locally (optional pre-submit check)
 * @param {Object} payload - Generation request
 * @returns {Object} { score: number, reasons: string[] }
 */
export const estimateFeasibility = (payload) => {
  const reasons = [];
  let score = 100;
  
  const totalWeeks = payload.timeframe?.unit === 'months' 
    ? payload.timeframe.value * 4 
    : payload.timeframe?.value || 12;
  
  // Very short timeline
  if (totalWeeks < 4) {
    score -= 30;
    reasons.push('Very limited timeframe - roadmap will be intensive');
  } else if (totalWeeks < 8) {
    score -= 15;
    reasons.push('Limited timeframe - focus on essentials');
  }
  
  // Experience vs complexity
  const currentLevel = payload.currentLevel?.toLowerCase() || 'beginner';
  const goal = payload.goal?.toLowerCase() || '';
  
  if (currentLevel === 'beginner' && (goal.includes('senior') || goal.includes('lead') || goal.includes('architect'))) {
    score -= 25;
    reasons.push('Senior role with beginner experience - steep learning curve');
  } else if (currentLevel === 'intermediate' && (goal.includes('architect') || goal.includes('principal'))) {
    score -= 15;
    reasons.push('Advanced role - significant skill gap to bridge');
  }
  
  // Many preferred topics
  if (payload.preferredTopics && payload.preferredTopics.length > 5) {
    score -= 10;
    reasons.push('Many focus areas - consider prioritizing core topics');
  }
  
  // Job description provided
  if (payload.jobDescription && payload.jobDescription.length > 100) {
    score += 10;
    reasons.push('Job description provided - roadmap will be highly tailored');
  }
  
  // Current skills provided
  if (payload.skills && payload.skills.length > 0) {
    score += 5;
    reasons.push('Current skills identified - better personalization');
  }
  
  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
  };
};

export default {
  initSocketConnection,
  subscribeToRoadmapEvents,
  onConnectionChange,
  disconnectSocket,
  generateRoadmap,
  getRoadmap,
  updateMilestone,
  getRoadmapProvenance,
  exportRoadmap,
  getUserRoadmaps,
  deleteRoadmap,
  validateGenerationPayload,
  estimateFeasibility,
};
