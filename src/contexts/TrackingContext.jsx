import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { getAuthToken, getAuthHeaders, getUserId } from '../utils/auth';

const TrackingContext = createContext();

// API_BASE includes /api suffix from env var (VITE_API_URL = http://localhost:5000/api)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Socket.IO base without /api suffix
const SOCKET_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error('useTracking must be used within TrackingProvider');
  }
  return context;
};

export const TrackingProvider = ({ children, userId }) => {
  const [metrics, setMetrics] = useState(null);
  const [isTracking, setIsTracking] = useState(true);
  const sessionId = useRef(`session-${Date.now()}`);
  const activityQueue = useRef([]);
  const startTime = useRef(Date.now());
  const socketRef = useRef(null);
  const pageStartTime = useRef(Date.now());
  const currentActivity = useRef(null);

  // Initialize Socket.IO for real-time updates
  useEffect(() => {
    if (!userId) return;

    const token = getAuthToken();
    const socket = io(SOCKET_BASE, {
      auth: { 
        userId,
        token // Include token for backend authentication
      },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('[Tracking] Socket connected');
      socket.emit('join', `user-${userId}`);
    });

    socket.on('activity:tracked', (data) => {
      console.log('[Tracking] Activity tracked:', data);
      // Refresh metrics
      loadMetrics();
    });

    socket.on('metrics:updated', (data) => {
      console.log('[Tracking] Metrics updated:', data);
      setMetrics(prev => ({ ...prev, ...data }));
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  // Load initial metrics
  useEffect(() => {
    if (userId && isTracking) {
      loadMetrics();
      
      // Track login
      track('login', {});
      
      // Set up periodic sync (every 30 seconds)
      const syncInterval = setInterval(() => {
        syncQueuedActivities();
      }, 30000);
      
      return () => clearInterval(syncInterval);
    }
  }, [userId, isTracking]);

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page hidden - track time spent
        if (currentActivity.current) {
          const duration = Date.now() - pageStartTime.current;
          track(currentActivity.current.type, {
            ...currentActivity.current.metadata,
            timeSpent: Math.floor(duration / 1000)
          }, duration);
        }
      } else {
        // Page visible - reset timer
        pageStartTime.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Track page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Sync queued activities before leaving
      syncQueuedActivities(true);
      
      // Track logout/session end
      const duration = Date.now() - startTime.current;
      track('logout', { sessionDuration: Math.floor(duration / 1000) }, duration, true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await axios.get(`${API_BASE}/tracking/metrics`, {
        headers: getAuthHeaders()
      });
      setMetrics(response.data);
    } catch (error) {
      console.error('[Tracking] Error loading metrics:', error);
      // Don't fail silently - tracking is optional
    }
  };

  const track = async (activityType, metadata = {}, duration = 0, immediate = false) => {
    if (!isTracking || !userId) return;

    const activity = {
      activityType,
      metadata: {
        ...metadata,
        pageUrl: window.location.pathname,
        sessionId: sessionId.current
      },
      duration,
      timestamp: new Date().toISOString()
    };

    if (immediate) {
      // Send immediately (for critical events like logout)
      try {
        await axios.post(`${API_BASE}/tracking/activity`, activity, {
          headers: { 
            ...getAuthHeaders(),
            'X-Session-Id': sessionId.current
          }
        });
      } catch (error) {
        console.error('[Tracking] Error tracking immediate activity:', error);
        // Don't fail silently - tracking is optional
      }
    } else {
      // Queue for batch sync
      activityQueue.current.push(activity);
      
      // Auto-sync if queue gets large
      if (activityQueue.current.length >= 10) {
        syncQueuedActivities();
      }
    }

    currentActivity.current = { type: activityType, metadata };
  };

  const syncQueuedActivities = async (synchronous = false) => {
    if (activityQueue.current.length === 0) return;

    const activities = [...activityQueue.current];
    activityQueue.current = [];

    try {
      const token = getAuthToken();
      
      if (synchronous && navigator.sendBeacon) {
        // Use sendBeacon for synchronous requests (page unload)
        const blob = new Blob([JSON.stringify({ activities })], { type: 'application/json' });
        navigator.sendBeacon(`${API_BASE}/tracking/batch?token=${token}`, blob);
      } else {
        // Regular async request
        await axios.post(`${API_BASE}/tracking/batch`, { activities }, {
          headers: getAuthHeaders()
        });
      }
    } catch (error) {
      console.error('[Tracking] Error syncing activities:', error);
      // Re-queue failed activities
      activityQueue.current = [...activities, ...activityQueue.current];
    }
  };

  // Convenience tracking methods
  const trackPageView = (pagePath) => {
    track('page_view', { pageUrl: pagePath });
  };

  const trackQuestionSolved = (questionId, difficulty, timeSpent, score, category) => {
    track('question_solved', {
      questionId,
      questionDifficulty: difficulty,
      timeSpent,
      score,
      success: true,
      category
    }, timeSpent * 1000);
  };

  const trackQuestionAttempted = (questionId, difficulty) => {
    track('question_attempted', {
      questionId,
      questionDifficulty: difficulty,
      success: false
    });
  };

  const trackCodeRun = (language, testCasesPassed, testCasesTotal, errorCount) => {
    track('code_run', {
      codeLanguage: language,
      testCasesPassed,
      testCasesTotal,
      errorCount,
      success: testCasesPassed === testCasesTotal
    });
  };

  const trackMockInterview = (interviewId, score, duration) => {
    track('mock_interview', {
      interviewId,
      score,
      timeSpent: Math.floor(duration / 1000)
    }, duration);
  };

  const trackRoadmapGenerated = (roadmapId, role, targetDate) => {
    track('roadmap_generated', { roadmapId, role, targetDate });
  };

  const trackMilestoneCompleted = (roadmapId, milestoneId, timeSpent) => {
    track('roadmap_milestone_completed', {
      roadmapId,
      milestoneId,
      timeSpent
    }, timeSpent * 1000);
  };

  const trackFocusMode = (started, duration = 0) => {
    track(started ? 'focus_mode_started' : 'focus_mode_ended', {
      timeSpent: Math.floor(duration / 1000)
    }, duration);
  };

  const trackHintViewed = (questionId) => {
    track('hint_viewed', { questionId });
  };

  const trackSolutionViewed = (questionId) => {
    track('solution_viewed', { questionId });
  };

  const trackCollaboration = (joined, roomId, duration = 0) => {
    track(joined ? 'collaboration_joined' : 'collaboration_left', {
      collaborationRoomId: roomId,
      timeSpent: Math.floor(duration / 1000)
    }, duration);
  };

  const trackResearchQuery = (query) => {
    track('research_query', { searchQuery: query });
  };

  const trackExport = (format) => {
    track('export_performed', { exportFormat: format });
  };

  const value = {
    metrics,
    isTracking,
    setIsTracking,
    track,
    trackPageView,
    trackQuestionSolved,
    trackQuestionAttempted,
    trackCodeRun,
    trackMockInterview,
    trackRoadmapGenerated,
    trackMilestoneCompleted,
    trackFocusMode,
    trackHintViewed,
    trackSolutionViewed,
    trackCollaboration,
    trackResearchQuery,
    trackExport,
    refreshMetrics: loadMetrics
  };

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  );
};
