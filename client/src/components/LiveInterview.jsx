/**
 * Live Video Interview Component
 * 
 * Production-grade video + audio interview with:
 * - Real-time camera preview
 * - Question display with timer
 * - Record per question
 * - Upload + evaluation flow
 * - Reconnection handling
 * - Full audit trail
 */

import React, { useState, useEffect, useRef } from 'react';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import io from 'socket.io-client';
import './LiveInterview.css';

export default function LiveInterview({ userId, resumeId, jobDescriptionId }) {
  // Socket connection
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  
  // Interview state
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [interviewStatus, setInterviewStatus] = useState('not-started'); // not-started, active, evaluating, completed
  
  // Media recording
  const {
    stream,
    isRecording,
    isPaused,
    error: mediaError,
    recordingDuration,
    requestPermissions,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cleanup
  } = useMediaRecorder();
  
  // UI state
  const [evaluation, setEvaluation] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  
  const videoRef = useRef(null);
  const questionStartTime = useRef(null);
  
  /**
   * Initialize Socket.IO connection
   */
  useEffect(() => {
    const newSocket = io('http://localhost:5000/interview', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setConnected(true);
      setError(null);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });
    
    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('Connection lost. Reconnecting...');
    });
    
    // Interview events
    newSocket.on('interview_started', (data) => {
      console.log('Interview started:', data);
    });
    
    newSocket.on('next_question', (data) => {
      console.log('Next question received:', data);
      setCurrentQuestion(data.question);
      setCurrentTurn(data.progress.turnNumber);
      setInterviewStatus('active');
      setEvaluation(null);
      questionStartTime.current = Date.now();
    });
    
    newSocket.on('follow_up_question', (data) => {
      console.log('Follow-up question:', data);
      setCurrentQuestion(data.question);
      setInterviewStatus('active');
      setEvaluation(null);
    });
    
    newSocket.on('interview_completed', (data) => {
      console.log('Interview completed:', data);
      setInterviewStatus('completed');
      setSummary(data.summary);
      cleanup();
    });
    
    newSocket.on('interview_error', (data) => {
      console.error('Interview error:', data);
      setError(data.error);
      setInterviewStatus('active');
    });
    
    setSocket(newSocket);
    
    return () => {
      cleanup();
      newSocket.disconnect();
    };
  }, [cleanup]);
  
  /**
   * Set video preview stream
   */
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  
  /**
   * Start interview
   */
  const handleStartInterview = async () => {
    try {
      setError(null);
      
      // Request camera/mic permissions first
      const permissionResult = await requestPermissions();
      if (!permissionResult.success) {
        setError(permissionResult.error);
        return;
      }
      
      // Start interview via Socket.IO
      socket.emit('start_interview', {
        userId,
        resumeId,
        jobDescriptionId,
        interviewType: 'technical'
      }, (response) => {
        if (response.success) {
          setSessionId(response.data.sessionId);
          setCurrentQuestion(response.data.firstQuestion);
          setCurrentTurn(response.data.context.turnNumber);
          setInterviewStatus('active');
          questionStartTime.current = Date.now();
        } else {
          setError(response.error);
        }
      });
      
    } catch (err) {
      console.error('Start interview error:', err);
      setError('Failed to start interview: ' + err.message);
    }
  };
  
  /**
   * Start recording answer
   */
  const handleStartAnswer = async () => {
    const result = await startRecording();
    if (!result.success) {
      setError(result.error);
    }
  };
  
  /**
   * Submit answer with video
   */
  const handleSubmitAnswer = async () => {
    try {
      setError(null);
      setInterviewStatus('evaluating');
      
      // Stop recording and get blob
      const recordingData = await stopRecording();
      const { blob, duration, size, mimeType, timestamp } = recordingData;
      
      console.log('Recording stopped:', { duration, size, mimeType });
      
      // Calculate time spent on question
      const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000);
      
      // Upload video
      setIsUploading(true);
      const mediaId = await uploadVideo(blob, {
        sessionId,
        questionId: currentQuestion.questionId || `q${currentTurn}`,
        duration,
        size,
        mimeType,
        timestamp
      });
      
      setIsUploading(false);
      
      // Submit answer via Socket.IO
      socket.emit('submit_answer', {
        sessionId,
        answer: '[VIDEO RESPONSE]', // Placeholder text
        timeSpent,
        mediaId,
        mediaDuration: duration,
        mediaSize: size
      }, (response) => {
        if (response.success) {
          setEvaluation(response.data.evaluation);
          
          if (response.data.type === 'interview_complete') {
            setInterviewStatus('completed');
            setSummary(response.data.summary);
            cleanup();
          } else if (response.data.type === 'follow_up') {
            setCurrentQuestion(response.data.nextQuestion);
            setInterviewStatus('active');
          } else {
            setCurrentQuestion(response.data.nextQuestion);
            setCurrentTurn(response.data.context.turnNumber);
            setInterviewStatus('active');
          }
        } else {
          setError(response.error);
          setInterviewStatus('active');
        }
      });
      
    } catch (err) {
      console.error('Submit answer error:', err);
      setError('Failed to submit answer: ' + err.message);
      setInterviewStatus('active');
      setIsUploading(false);
    }
  };
  
  /**
   * Upload video to backend
   */
  const uploadVideo = async (blob, metadata) => {
    const formData = new FormData();
    formData.append('video', blob, `answer-${metadata.questionId}-${Date.now()}.webm`);
    formData.append('sessionId', metadata.sessionId);
    formData.append('questionId', metadata.questionId);
    formData.append('duration', metadata.duration);
    formData.append('size', metadata.size);
    formData.append('mimeType', metadata.mimeType);
    formData.append('timestamp', metadata.timestamp);
    
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          setUploadProgress(0);
          resolve(response.mediaId);
        } else {
          reject(new Error('Upload failed: ' + xhr.statusText));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });
      
      xhr.open('POST', 'http://localhost:5000/api/media/upload');
      
      // Add auth token if available
      const token = localStorage.getItem('authToken');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.send(formData);
    });
  };
  
  /**
   * Format duration as MM:SS
   */
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  /**
   * Render evaluation feedback
   */
  const renderEvaluation = () => {
    if (!evaluation) return null;
    
    return (
      <div className="evaluation-panel">
        <h3>Answer Evaluation</h3>
        
        <div className="overall-score">
          <div className="score-circle">
            <span className="score-value">{evaluation.overallScore}</span>
            <span className="score-label">/ 100</span>
          </div>
        </div>
        
        <div className="metrics-grid">
          <div className="metric">
            <span className="metric-label">Clarity</span>
            <div className="metric-bar">
              <div className="metric-fill" style={{ width: `${evaluation.clarity}%` }}></div>
            </div>
            <span className="metric-value">{evaluation.clarity}</span>
          </div>
          
          <div className="metric">
            <span className="metric-label">Relevance</span>
            <div className="metric-bar">
              <div className="metric-fill" style={{ width: `${evaluation.relevance}%` }}></div>
            </div>
            <span className="metric-value">{evaluation.relevance}</span>
          </div>
          
          <div className="metric">
            <span className="metric-label">Depth</span>
            <div className="metric-bar">
              <div className="metric-fill" style={{ width: `${evaluation.depth}%` }}></div>
            </div>
            <span className="metric-value">{evaluation.depth}</span>
          </div>
          
          <div className="metric">
            <span className="metric-label">Structure</span>
            <div className="metric-bar">
              <div className="metric-fill" style={{ width: `${evaluation.structure}%` }}></div>
            </div>
            <span className="metric-value">{evaluation.structure}</span>
          </div>
        </div>
        
        {evaluation.feedback && (
          <div className="feedback-section">
            {evaluation.feedback.strengths && evaluation.feedback.strengths.length > 0 && (
              <div className="strengths">
                <h4>✅ Strengths</h4>
                <ul>
                  {evaluation.feedback.strengths.map((strength, i) => (
                    <li key={i}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {evaluation.feedback.improvements && evaluation.feedback.improvements.length > 0 && (
              <div className="improvements">
                <h4>💡 Areas for Improvement</h4>
                <ul>
                  {evaluation.feedback.improvements.map((improvement, i) => (
                    <li key={i}>{improvement}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  /**
   * Render summary
   */
  const renderSummary = () => {
    if (!summary) return null;
    
    return (
      <div className="summary-panel">
        <h2>🎉 Interview Complete!</h2>
        
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-value">{summary.totalQuestions}</span>
            <span className="stat-label">Questions</span>
          </div>
          <div className="stat">
            <span className="stat-value">{summary.averageScore}</span>
            <span className="stat-label">Avg Score</span>
          </div>
          <div className="stat">
            <span className="stat-value">{summary.duration}m</span>
            <span className="stat-label">Duration</span>
          </div>
        </div>
        
        <div className="recommendation">
          <h3>Overall Assessment</h3>
          <p>{summary.recommendation}</p>
        </div>
        
        {summary.strengthAreas && summary.strengthAreas.length > 0 && (
          <div className="strength-areas">
            <h3>✅ Strength Areas</h3>
            <div className="area-list">
              {summary.strengthAreas.map((area, i) => (
                <div key={i} className="area-item">
                  <span className="area-name">{area.area || area.topic}</span>
                  <span className="area-score">{area.score || area.averageScore}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {summary.improvementAreas && summary.improvementAreas.length > 0 && (
          <div className="improvement-areas">
            <h3>💡 Areas for Improvement</h3>
            <div className="area-list">
              {summary.improvementAreas.map((area, i) => (
                <div key={i} className="area-item">
                  <span className="area-name">{area.area || area.topic}</span>
                  <span className="area-score">{area.score || area.averageScore}</span>
                  {area.suggestion && <p className="area-suggestion">{area.suggestion}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="live-interview-container">
      {/* Header */}
      <div className="interview-header">
        <h1>Live Video Interview</h1>
        <div className="connection-status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}></span>
          <span className="status-text">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
      
      {/* Error display */}
      {(error || mediaError) && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error || mediaError}</span>
        </div>
      )}
      
      {/* Not started state */}
      {interviewStatus === 'not-started' && (
        <div className="start-screen">
          <div className="video-preview">
            <video ref={videoRef} autoPlay muted playsInline className="preview-video" />
            {!stream && (
              <div className="no-stream-overlay">
                <p>Camera will appear here</p>
              </div>
            )}
          </div>
          
          <div className="start-instructions">
            <h2>Ready to start your interview?</h2>
            <p>Make sure you're in a quiet environment with good lighting</p>
            <ul>
              <li>✓ Camera and microphone will be used</li>
              <li>✓ Each answer will be recorded</li>
              <li>✓ You can pause between questions</li>
              <li>✓ Evaluation is real-time</li>
            </ul>
            <button 
              className="btn-primary btn-lg"
              onClick={handleStartInterview}
              disabled={!connected}
            >
              {connected ? 'Start Interview' : 'Connecting...'}
            </button>
          </div>
        </div>
      )}
      
      {/* Active interview */}
      {interviewStatus === 'active' && currentQuestion && (
        <div className="interview-active">
          <div className="video-section">
            <video ref={videoRef} autoPlay muted playsInline className="interview-video" />
            
            {isRecording && (
              <div className="recording-indicator">
                <span className="rec-dot"></span>
                <span className="rec-text">REC {formatDuration(recordingDuration)}</span>
              </div>
            )}
            
            {isPaused && (
              <div className="paused-overlay">
                <span>⏸️ Paused</span>
              </div>
            )}
          </div>
          
          <div className="question-section">
            <div className="question-header">
              <span className="turn-number">Question {currentTurn}</span>
              {currentQuestion.isFollowUp && (
                <span className="follow-up-badge">Follow-up</span>
              )}
              <span className="difficulty-badge">{currentQuestion.difficulty}</span>
            </div>
            
            <div className="question-text">
              <h2>{currentQuestion.text}</h2>
            </div>
            
            {currentQuestion.expectedKeyPoints && currentQuestion.expectedKeyPoints.length > 0 && (
              <div className="key-points-hint">
                <p className="hint-label">Key topics to cover:</p>
                <div className="key-points-list">
                  {currentQuestion.expectedKeyPoints.map((point, i) => (
                    <span key={i} className="key-point-tag">{point}</span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="answer-controls">
              {!isRecording && (
                <button 
                  className="btn-success btn-lg"
                  onClick={handleStartAnswer}
                >
                  🎥 Start Recording Answer
                </button>
              )}
              
              {isRecording && !isPaused && (
                <>
                  <button 
                    className="btn-warning"
                    onClick={pauseRecording}
                  >
                    ⏸️ Pause
                  </button>
                  <button 
                    className="btn-primary btn-lg"
                    onClick={handleSubmitAnswer}
                  >
                    ✓ Submit Answer
                  </button>
                </>
              )}
              
              {isPaused && (
                <button 
                  className="btn-success"
                  onClick={resumeRecording}
                >
                  ▶️ Resume
                </button>
              )}
            </div>
            
            {evaluation && renderEvaluation()}
          </div>
        </div>
      )}
      
      {/* Evaluating state */}
      {interviewStatus === 'evaluating' && (
        <div className="evaluating-screen">
          <div className="loading-spinner"></div>
          {isUploading && (
            <>
              <p>Uploading video... {uploadProgress}%</p>
              <div className="upload-progress-bar">
                <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </>
          )}
          {!isUploading && <p>Evaluating your answer...</p>}
        </div>
      )}
      
      {/* Completed state */}
      {interviewStatus === 'completed' && (
        <div className="completed-screen">
          {renderSummary()}
        </div>
      )}
    </div>
  );
}
