// MockInterviewRoom - Complete Video Interview Component with Voice Agent
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, MessageSquare, Code, PenTool, X, PhoneOff, Users, Clock, Star, Volume2, VolumeX, Bot, BarChart2, FileText } from 'lucide-react';
import socketService from '../services/socket';
import voiceAgent from '../services/voiceAgent';
import { mockInterviewAPI } from '../services/api';
import { useInterviewSessionStore } from '../store/interviewSessionStore';
import useMockInterviewAI from '../hooks/useMockInterviewAI';
import MockInterviewAIPanel from './MockInterviewAIPanel';
import './MockInterviewRoom.css';

const MockInterviewRoom = ({ interviewId, onExit, interviewType = 'technical', difficulty = 'medium', resumeText = '', jobDescription = '' }) => {
  const navigate = useNavigate();
  const { completeSession } = useInterviewSessionStore();

  // ── AI Mode state ─────────────────────────────────────
  const [aiMode, setAiMode] = useState(true); // true = solo AI, false = human partner
  const [aiMuted, setAiMuted] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // ── Auth (for userId) ─────────────────────────────────
  const userId = (() => { try { return JSON.parse(localStorage.getItem('auth-storage'))?.state?.user?._id; } catch { return null; } })();

  // ── AI hook (all AI features centralised here) ────────
  const ai = useMockInterviewAI({
    mockInterviewId: interviewId,
    userId,
    interviewType,
    difficulty,
    resumeText,
    jobDescription,
  });

  // State management
  const [interview, setInterview] = useState(null);
  const [partner, setPartner] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVoiceAgentEnabled, setIsVoiceAgentEnabled] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  // UI states
  const [activeTab, setActiveTab] = useState(aiMode ? 'ai' : 'video'); // video, chat, code, ai
  const [messages, setMessages] = useState([]);
  const [code, setCode] = useState('// Write your code here...\n\n');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenShareRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const chatInputRef = useRef(null);
  const canvasRef = useRef(null);

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // ===========================
  // Initialization
  // ===========================

  useEffect(() => {
    initializeInterview();
    startTimer();

    return () => {
      cleanup();
    };
  }, [interviewId]);

  const initializeInterview = async () => {
    try {
      // Fetch interview details
      const response = await mockInterviewAPI.get(interviewId);
      setInterview(response.data?.data || response.data);

      // Connect to mock interview socket
      const token = (() => { try { return JSON.parse(localStorage.getItem('auth-storage'))?.state?.token || ''; } catch { return ''; } })();
      socketService.connectMockInterview(token);

      // Setup socket listeners
      setupSocketListeners();

      // Join interview room
      socketService.joinInterview(interviewId, userId, 'candidate');

      // Initialize media
      await initializeMedia();

      // Setup WebRTC
      await setupWebRTC();

    } catch (error) {
      console.error('Failed to initialize interview:', error);
    }
  };

  const setupSocketListeners = () => {
    // Partner events
    socketService.onPartnerJoined((data) => {
      console.log('Partner joined:', data);
      setPartner(data.partner);
      setIsConnected(true);
    });

    socketService.onPartnerLeft(() => {
      console.log('Partner left');
      setIsConnected(false);
      setPartner(null);
    });

    // WebRTC signaling
    socketService.onWebRTCOffer(async ({ offer }) => {
      await handleWebRTCOffer(offer);
    });

    socketService.onWebRTCAnswer(async ({ answer }) => {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socketService.onICECandidate(async ({ candidate }) => {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    });

    // Media control events
    socketService.onVideoToggled(({ enabled }) => {
      // Partner toggled video
      console.log('Partner video:', enabled ? 'enabled' : 'disabled');
    });

    socketService.onAudioToggled(({ enabled }) => {
      // Partner toggled audio
      console.log('Partner audio:', enabled ? 'enabled' : 'disabled');
    });

    // Collaboration events
    socketService.onMessage((data) => {
      setMessages(prev => [...prev, { sender: 'partner', text: data.message, time: new Date() }]);
    });

    socketService.onCodeChange(({ code }) => {
      setCode(code);
    });

    socketService.onRolesSwitched((data) => {
      console.log('Roles switched:', data);
      voiceAgent.speak('Roles have been switched. You are now the ' + data.newRole);
    });

    socketService.onInterviewEnded(() => {
      setShowFeedbackModal(true);
    });
  };

  // ===========================
  // Media & WebRTC Setup
  // ===========================

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Failed to get media:', error);
    }
  };

  const setupWebRTC = async () => {
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendICECandidate(interviewId, event.candidate);
      }
    };

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketService.sendWebRTCOffer(interviewId, offer);
  };

  const handleWebRTCOffer = async (offer) => {
    const pc = peerConnectionRef.current;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketService.sendWebRTCAnswer(interviewId, answer);
  };

  // ===========================
  // Media Controls
  // ===========================

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
      socketService.toggleVideo(interviewId, videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
      socketService.toggleAudio(interviewId, audioTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      setIsScreenSharing(false);
      socketService.stopScreenShare(interviewId);
      // Switch back to camera
      await initializeMedia();
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        socketService.startScreenShare(interviewId);
      } catch (error) {
        console.error('Screen share failed:', error);
      }
    }
  };

  // ===========================
  // Voice Agent Controls
  // ===========================

  const toggleVoiceAgent = () => {
    if (isVoiceAgentEnabled) {
      voiceAgent.stopInterviewTranscription();
      setIsVoiceAgentEnabled(false);
    } else {
      voiceAgent.startInterviewTranscription({
        onResult: (finalTranscript, fullTranscript) => {
          setTranscript(fullTranscript);
          // Analyze response
          voiceAgent.analyzeResponse(finalTranscript).then(analysis => {
            console.log('Speech analysis:', analysis);
          });
        },
        onInterim: (interim) => {
          setInterimTranscript(interim);
        },
      });
      setIsVoiceAgentEnabled(true);
      voiceAgent.speak('Voice agent activated. I will transcribe and analyze your responses.');
    }
  };

  // ===========================
  // Collaboration Features
  // ===========================

  const sendMessage = () => {
    const input = chatInputRef.current;
    if (input && input.value.trim()) {
      const message = {
        sender: 'me',
        text: input.value,
        time: new Date(),
      };
      setMessages(prev => [...prev, message]);
      socketService.sendMessage(interviewId, input.value);
      input.value = '';
    }
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socketService.sendCodeChange(interviewId, newCode);
  };

  const switchRoles = async () => {
    try {
      await mockInterviewAPI.switchRoles(interviewId);
      socketService.switchRoles(interviewId);
    } catch (error) {
      console.error('Failed to switch roles:', error);
    }
  };

  const endInterview = async () => {
    try {
      await mockInterviewAPI.end(interviewId);
      socketService.endInterview(interviewId);
      completeSession();
      // If in AI mode, generate report before showing modal
      if (aiMode && ai.turns.length > 0) {
        await ai.completeSession();
        setShowReportModal(true);
      } else {
        setShowFeedbackModal(true);
      }
    } catch (error) {
      console.error('Failed to end interview:', error);
      setShowFeedbackModal(true);
    }
  };

  const goToReport = () => {
    setShowFeedbackModal(false);
    setShowReportModal(false);
    if (interviewId) {
      navigate(`/mock-interview/${interviewId}/report`);
    } else if (onExit) {
      onExit();
    }
  };

  // ===========================
  // Timer
  // ===========================

  const startTimer = () => {
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ===========================
  // Cleanup
  // ===========================

  const cleanup = () => {
    // Stop media streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Stop voice agent
    if (isVoiceAgentEnabled) {
      voiceAgent.stopInterviewTranscription();
    }

    // Leave interview
    socketService.leaveInterview(interviewId);
  };

  // ===========================
  // Render
  // ===========================

  return (
    <div className="mock-interview-room">
      {/* Header */}
      <div className="interview-header">
        <div className="interview-info">
          <Users size={20} />
          <span>{interview?.type} Interview</span>
          {partner && <span className="partner-name">with {partner.name}</span>}
        </div>
        <div className="interview-timer">
          <Clock size={20} />
          <span>{formatTime(timeElapsed)}</span>
        </div>
        <div className="connection-status">
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <span>{isConnected ? 'Connected' : 'Waiting for partner...'}</span>
        </div>
      </div>

      {/* Video Area */}
      <div className="video-container">
        {/* Remote Video */}
        <div className="video-main">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="remote-video"
          />
          {isScreenSharing && (
            <video
              ref={screenShareRef}
              autoPlay
              playsInline
              className="screen-share-video"
            />
          )}
          {partner && <div className="video-label">{partner.name}</div>}
        </div>

        {/* Local Video */}
        <div className="video-pip">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="local-video"
          />
          <div className="video-label">You</div>
        </div>

        {/* Voice Transcript Overlay */}
        {isVoiceAgentEnabled && (transcript || interimTranscript) && (
          <div className="transcript-overlay">
            <div className="transcript-content">
              <p className="transcript-final">{transcript}</p>
              <p className="transcript-interim">{interimTranscript}</p>
            </div>
          </div>
        )}
      </div>

      {/* Side Panel */}
      <div className="side-panel">
        {/* Tabs */}
        <div className="panel-tabs">
          <button
            className={activeTab === 'ai' ? 'active' : ''}
            onClick={() => setActiveTab('ai')}
            title="AI Interviewer"
          >
            <Bot size={18} />
            AI
          </button>
          <button
            className={activeTab === 'video' ? 'active' : ''}
            onClick={() => setActiveTab('video')}
          >
            <Video size={18} />
            Info
          </button>
          <button
            className={activeTab === 'chat' ? 'active' : ''}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={18} />
            Chat
          </button>
          <button
            className={activeTab === 'code' ? 'active' : ''}
            onClick={() => setActiveTab('code')}
          >
            <Code size={18} />
            Code
          </button>
        </div>

        {/* Tab Content */}
        <div className="panel-content">

          {/* ── AI Interviewer Tab ──────────────────────────── */}
          {activeTab === 'ai' && (
            <MockInterviewAIPanel
              currentQuestion={ai.currentQuestion}
              currentAnswer={ai.currentAnswer}
              setCurrentAnswer={ai.setCurrentAnswer}
              answerSubmitted={ai.answerSubmitted}
              currentEvaluation={ai.currentEvaluation}
              evaluationComplete={ai.evaluationComplete}
              followUpQuestion={ai.followUpQuestion}
              currentDifficulty={ai.currentDifficulty}
              codingProblem={ai.codingProblem}
              isAISpeaking={ai.isAISpeaking}
              aiText={ai.aiText}
              isListening={ai.isListening}
              transcript={ai.transcript}
              isLoading={ai.isLoading}
              turns={ai.turns}
              requestNextQuestion={ai.requestNextQuestion}
              requestCodingProblem={ai.requestCodingProblem}
              submitAnswer={ai.submitAnswer}
              speakText={ai.speakText}
              stopSpeaking={ai.stopSpeaking}
              startListening={ai.startListening}
              stopListening={ai.stopListening}
              muted={aiMuted}
              onMuteToggle={() => {
                if (!aiMuted) ai.stopSpeaking();
                setAiMuted((v) => !v);
              }}
            />
          )}

          {activeTab === 'video' && (
            <div className="video-info">
              <h3>Interview Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Type:</span>
                  <span className="value">{interview?.type}</span>
                </div>
                <div className="info-item">
                  <span className="label">Difficulty:</span>
                  <span className="value">{interview?.difficulty}</span>
                </div>
                <div className="info-item">
                  <span className="label">Duration:</span>
                  <span className="value">{interview?.duration} min</span>
                </div>
                <div className="info-item">
                  <span className="label">Topics:</span>
                  <span className="value">{interview?.topics?.join(', ')}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="chat-panel">
              <div className="messages">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`message ${msg.sender}`}>
                    <div className="message-text">{msg.text}</div>
                    <div className="message-time">
                      {msg.time.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="chat-input">
                <input
                  ref={chatInputRef}
                  type="text"
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage}>Send</button>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="code-panel">
              <textarea
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="code-editor"
                spellCheck={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <div className="control-bar">
        <div className="controls-left">
          <button
            className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
            onClick={toggleVideo}
            title="Toggle Video"
          >
            {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
          </button>
          <button
            className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
            onClick={toggleAudio}
            title="Toggle Audio"
          >
            {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          <button
            className={`control-btn ${isScreenSharing ? 'active' : ''}`}
            onClick={toggleScreenShare}
            title="Share Screen"
          >
            {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
          </button>
          <button
            className={`control-btn ${isVoiceAgentEnabled ? 'active' : ''}`}
            onClick={toggleVoiceAgent}
            title="Voice Agent"
          >
            {isVoiceAgentEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
        </div>

        <div className="controls-center">
          <button className="control-btn switch-roles" onClick={switchRoles}>
            <Users size={24} />
            Switch Roles
          </button>
        </div>

        <div className="controls-right">
          {ai.turns.length > 0 && (
            <button
              className="control-btn"
              onClick={() => setShowReportModal(true)}
              title="View AI Report"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
            >
              <BarChart2 size={20} />
              Report
            </button>
          )}
          <button className="control-btn end-call" onClick={endInterview}>
            <PhoneOff size={24} />
            End Interview
          </button>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackModal
          interviewId={interviewId}
          onClose={goToReport}
        />
      )}

      {/* AI Report Ready Modal */}
      {showReportModal && (
        <AIReportModal
          report={ai.finalReport}
          turns={ai.turns}
          onClose={() => setShowReportModal(false)}
          onViewFull={goToReport}
        />
      )}
    </div>
  );
};

// Feedback Modal Component
const FeedbackModal = ({ interviewId, onClose }) => {
  const [ratings, setRatings] = useState({
    technical: 0,
    communication: 0,
    problemSolving: 0,
    codeQuality: 0,
    overall: 0,
  });
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [comments, setComments] = useState('');

  const handleSubmit = async () => {
    try {
      await mockInterviewAPI.submitFeedback(interviewId, {
        ratings,
        strengths: strengths.split('\n').filter(s => s.trim()),
        improvements: improvements.split('\n').filter(s => s.trim()),
        comments,
      });
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  return (
    <div className="feedback-modal-overlay">
      <div className="feedback-modal">
        <div className="modal-header">
          <h2>Interview Feedback</h2>
          <button onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-content">
          <div className="rating-section">
            <h3>Rate the Performance (1-5 stars)</h3>
            {Object.keys(ratings).map(key => (
              <div key={key} className="rating-row">
                <label>{key.replace(/([A-Z])/g, ' $1').trim()}:</label>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      size={24}
                      fill={star <= ratings[key] ? '#fbbf24' : 'none'}
                      stroke={star <= ratings[key] ? '#fbbf24' : '#d1d5db'}
                      onClick={() => setRatings(prev => ({ ...prev, [key]: star }))}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="feedback-section">
            <label>Strengths (one per line):</label>
            <textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="List key strengths..."
              rows={3}
            />
          </div>

          <div className="feedback-section">
            <label>Areas for Improvement (one per line):</label>
            <textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              placeholder="List areas to improve..."
              rows={3}
            />
          </div>

          <div className="feedback-section">
            <label>Additional Comments:</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share your overall feedback..."
              rows={4}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Skip
          </button>
          <button className="btn-primary" onClick={handleSubmit}>
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   AI Report Modal  – quick summary after AI mock interview
════════════════════════════════════════════════════════════ */
const AIReportModal = ({ report, turns, onClose, onViewFull }) => {
  const dims = ['clarity', 'technicalAccuracy', 'depth', 'structure', 'relevance'];
  const scores = report?.sectionScores || {};
  const overall = report?.overallScore ?? 0;

  const grade =
    overall >= 85 ? 'A' : overall >= 70 ? 'B' : overall >= 55 ? 'C' : overall >= 40 ? 'D' : 'F';

  const gradeColor =
    grade === 'A' ? '#22c55e' : grade === 'B' ? '#3b82f6' : grade === 'C' ? '#f59e0b' : '#ef4444';

  return (
    <div className="feedback-modal-overlay" style={{ zIndex: 9999 }}>
      <div
        className="feedback-modal"
        style={{ maxWidth: 540, background: '#0f172a', color: '#f1f5f9', border: '1px solid #1e293b' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderColor: '#1e293b' }}>
          <h2 style={{ color: '#f1f5f9' }}>🤖 AI Interview Report</h2>
          <button onClick={onClose} style={{ color: '#94a3b8' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content" style={{ gap: 20 }}>
          {/* Overall score */}
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 56, fontWeight: 800, color: gradeColor, lineHeight: 1 }}>
              {grade}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              Overall Score: {overall}/100 · {report?.readinessLabel?.replace('-', ' ') || 'N/A'}
            </div>
          </div>

          {/* Section scores */}
          {Object.keys(scores).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {dims.map((d) => (
                <div
                  key={d}
                  style={{ background: '#1e293b', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}
                >
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#818cf8' }}>{scores[d] ?? 0}</div>
                  <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>/100</div>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'capitalize' }}>
                    {d.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Strengths */}
          {report?.strengths?.length > 0 && (
            <div>
              <p style={{ fontWeight: 600, color: '#22c55e', marginBottom: 6, fontSize: 13 }}>✅ Strengths</p>
              <ul style={{ listStyle: 'disc', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {report.strengths.map((s, i) => (
                  <li key={i} style={{ fontSize: 12, color: '#cbd5e1' }}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {report?.improvements?.length > 0 && (
            <div>
              <p style={{ fontWeight: 600, color: '#f59e0b', marginBottom: 6, fontSize: 13 }}>💡 Improvements</p>
              <ul style={{ listStyle: 'disc', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {report.improvements.map((s, i) => (
                  <li key={i} style={{ fontSize: 12, color: '#cbd5e1' }}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Questions answered breakdown */}
          <div style={{ fontSize: 12, color: '#64748b', background: '#1e293b', borderRadius: 8, padding: 10 }}>
            <span>Questions asked: {turns.length}</span>
            {' · '}
            <span>Coding solved: {report?.codingProblemsSolved ?? 0}</span>
            {' · '}
            <span>Duration: {report?.durationSeconds ? `${Math.round(report.durationSeconds / 60)} min` : 'N/A'}</span>
          </div>
        </div>

        <div className="modal-footer" style={{ borderColor: '#1e293b' }}>
          <button className="btn-secondary" onClick={onClose} style={{ color: '#94a3b8', background: '#1e293b' }}>
            Close
          </button>
          <button className="btn-primary" onClick={onViewFull} style={{ background: '#4f46e5' }}>
            <FileText size={14} style={{ marginRight: 6 }} />
            Full Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default MockInterviewRoom;
