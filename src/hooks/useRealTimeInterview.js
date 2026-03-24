import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

/**
 * Real-Time Interview Hook
 * Connects to WebSocket /interview namespace for live interview sessions.
 * Event names match server/sockets/interviewSocket.js exactly.
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
    const token = (() => { try { return JSON.parse(localStorage.getItem('auth-storage'))?.state?.token || ''; } catch { return ''; } })();
    const newSocket = io(`${SOCKET_URL}/interview`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { token },
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

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

    // Server emits 'interview_started' after start_interview callback
    newSocket.on('interview_started', (data) => {
      console.log('Interview started (broadcast):', data);
    });

    // Server emits 'next_question' when moving to the next question
    newSocket.on('next_question', (data) => {
      console.log('Next question:', data);
      setCurrentQuestion(data.question);
      setTurnNumber(data.progress?.turnNumber ?? 0);
      setEvaluation(null);
      setIsEvaluating(false);
    });

    // Server emits 'follow_up_question' for follow-ups
    newSocket.on('follow_up_question', (data) => {
      console.log('Follow-up question:', data);
      setCurrentQuestion(data.question);
      setIsEvaluating(false);
    });

    // Server emits 'interview_completed' when session is done
    newSocket.on('interview_completed', (data) => {
      console.log('Interview completed:', data);
      setIsCompleted(true);
      setFinalEvaluation(data.summary);
      setIsEvaluating(false);
    });

    // Server emits 'interview_ended' when ended early
    newSocket.on('interview_ended', (data) => {
      console.log('Interview ended:', data);
      setIsCompleted(true);
      setIsEvaluating(false);
    });

    // Server emits 'interview_error' on unhandled errors
    newSocket.on('interview_error', (data) => {
      console.error('Interview error:', data);
      setError(data.error);
      setIsEvaluating(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Start interview — emits 'start_interview', uses callback for first question
  const startInterview = useCallback((interviewType = 'technical') => {
    if (!socketRef.current?.connected) {
      setError('Not connected to server');
      return;
    }

    setError(null);
    setIsCompleted(false);
    setFinalEvaluation(null);

    socketRef.current.emit('start_interview', {
      userId,
      resumeId,
      jobDescriptionId,
      interviewType,
    }, (response) => {
      if (response.success) {
        const { sessionId: sid, firstQuestion } = response.data;
        setSessionId(sid);
        if (firstQuestion) {
          setCurrentQuestion(firstQuestion);
          setTurnNumber(1);
        }
        console.log('Interview started:', sid);
      } else {
        setError(response.error);
      }
    });
  }, [userId, resumeId, jobDescriptionId]);

  // Submit answer — emits 'submit_answer', evaluation arrives in callback
  const submitAnswer = useCallback((answer, timeSpent) => {
    if (!socketRef.current || !sessionId) {
      setError('No active session');
      return;
    }

    setError(null);
    setIsEvaluating(true);

    socketRef.current.emit('submit_answer', {
      sessionId,
      answer,
      timeSpent: timeSpent || 0,
    }, (response) => {
      if (response.success) {
        setEvaluation(response.data?.evaluation || null);
        // next_question / interview_completed will arrive as broadcast events
      } else {
        setError(response.error);
        setIsEvaluating(false);
      }
    });
  }, [sessionId]);

  // Typing indicator — emits 'typing' (broadcast only, no callback)
  const sendTyping = useCallback(() => {
    if (socketRef.current?.connected && sessionId) {
      socketRef.current.emit('typing', { sessionId });
    }
  }, [sessionId]);

  // End interview early
  const endInterview = useCallback(() => {
    if (!socketRef.current || !sessionId) return;
    socketRef.current.emit('end_interview', { sessionId }, (response) => {
      if (response.success) {
        setIsCompleted(true);
      } else {
        setError(response.error);
      }
    });
  }, [sessionId]);

  // Rejoin existing session room (when navigating back to an active session)
  const joinSession = useCallback((existingSessionId) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('join_session', { sessionId: existingSessionId, userId }, (res) => {
      if (res.success) setSessionId(existingSessionId);
    });
  }, [userId]);

  return {
    connected,
    socket,
    sessionId,
    currentQuestion,
    turnNumber,
    evaluation,
    sessionState,
    isEvaluating,
    isCompleted,
    finalEvaluation,
    error,
    startInterview,
    submitAnswer,
    sendTyping,
    endInterview,
    joinSession,
  };
}

export default useRealTimeInterview;
