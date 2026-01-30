import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

/**
 * Real-Time Interview Hook
 * Connects to WebSocket for live interview sessions
 */

export function useRealTimeInterview(userId, resumeId, jobDescriptionId) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [turnNumber, setTurnNumber] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [sessionState, setSessionState] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalEvaluation, setFinalEvaluation] = useState(null);
  const [error, setError] = useState(null);
  
  const socketRef = useRef(null);
  
  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000/interview', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = newSocket;
    setSocket(newSocket);
    
    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected to interview server');
      setConnected(true);
      setError(null);
    });
    
    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from interview server');
      setConnected(false);
    });
    
    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to server. Retrying...');
    });
    
    // Interview events
    newSocket.on('interview:session_started', (data) => {
      console.log('Session started:', data);
      setSessionState(data.state);
    });
    
    newSocket.on('interview:question', (data) => {
      console.log('New question:', data);
      setCurrentQuestion(data.question);
      setTurnNumber(data.turnNumber);
      setEvaluation(null);
      setIsEvaluating(false);
    });
    
    newSocket.on('interview:evaluating', (data) => {
      console.log('Evaluating answer:', data);
      setIsEvaluating(true);
    });
    
    newSocket.on('interview:evaluation', (data) => {
      console.log('Evaluation received:', data);
      setEvaluation(data);
      setIsEvaluating(false);
    });
    
    newSocket.on('interview:state_update', (data) => {
      console.log('State updated:', data);
      setSessionState(data.state);
    });
    
    newSocket.on('interview:completed', (data) => {
      console.log('Interview completed:', data);
      setIsCompleted(true);
      setFinalEvaluation(data.finalEvaluation);
      setIsEvaluating(false);
    });
    
    newSocket.on('interview:error', (data) => {
      console.error('Interview error:', data);
      setError(data.error);
      setIsEvaluating(false);
    });
    
    newSocket.on('interview:hint', (data) => {
      console.log('Hint received:', data.hint);
      // You can handle hints in UI
    });
    
    // Cleanup
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
  // Start interview
  const startInterview = useCallback((interviewType = 'technical') => {
    if (!socket || !connected) {
      setError('Not connected to server');
      return;
    }
    
    setError(null);
    setIsCompleted(false);
    setFinalEvaluation(null);
    
    socket.emit('interview:start', {
      userId,
      resumeId,
      jobDescriptionId,
      interviewType,
    }, (response) => {
      if (response.success) {
        setSessionId(response.sessionId);
        console.log('Interview started:', response.sessionId);
      } else {
        setError(response.error);
      }
    });
  }, [socket, connected, userId, resumeId, jobDescriptionId]);
  
  // Submit answer
  const submitAnswer = useCallback((answer, timeSpent) => {
    if (!socket || !sessionId) {
      setError('No active session');
      return;
    }
    
    setError(null);
    setIsEvaluating(true);
    
    socket.emit('interview:submit_answer', {
      sessionId,
      answer,
      timeSpent,
    }, (response) => {
      if (!response.success) {
        setError(response.error);
        setIsEvaluating(false);
      }
    });
  }, [socket, sessionId]);
  
  // Send typing indicator
  const sendTyping = useCallback((isTyping) => {
    if (socket && sessionId) {
      socket.emit('interview:typing', {
        sessionId,
        isTyping,
      });
    }
  }, [socket, sessionId]);
  
  // Request hint
  const requestHint = useCallback(() => {
    if (!socket || !sessionId) return;
    
    socket.emit('interview:request_hint', {
      sessionId,
    }, (response) => {
      if (!response.success) {
        console.error('Failed to get hint:', response.error);
      }
    });
  }, [socket, sessionId]);
  
  // Get current status
  const getStatus = useCallback(() => {
    if (!socket || !sessionId) return;
    
    socket.emit('interview:get_status', {
      sessionId,
    }, (response) => {
      if (response.success) {
        setSessionState(response.state);
      }
    });
  }, [socket, sessionId]);
  
  // Pause interview
  const pauseInterview = useCallback(() => {
    if (!socket || !sessionId) return;
    
    socket.emit('interview:pause', {
      sessionId,
    }, (response) => {
      if (response.success) {
        console.log('Interview paused');
      }
    });
  }, [socket, sessionId]);
  
  // Resume interview
  const resumeInterview = useCallback(() => {
    if (!socket || !sessionId) return;
    
    socket.emit('interview:resume', {
      sessionId,
    }, (response) => {
      if (response.success) {
        console.log('Interview resumed');
      }
    });
  }, [socket, sessionId]);
  
  return {
    // Connection state
    connected,
    socket,
    
    // Interview state
    sessionId,
    currentQuestion,
    turnNumber,
    evaluation,
    sessionState,
    isEvaluating,
    isCompleted,
    finalEvaluation,
    error,
    
    // Actions
    startInterview,
    submitAnswer,
    sendTyping,
    requestHint,
    getStatus,
    pauseInterview,
    resumeInterview,
  };
}

export default useRealTimeInterview;
