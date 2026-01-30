// MockInterviewRoom - Complete Video Interview Component with Voice Agent
import React, { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, MessageSquare, Code, PenTool, X, PhoneOff, Users, Clock, Star, Volume2, VolumeX } from 'lucide-react';
import socketService from '../services/socket';
import voiceAgent from '../services/voiceAgent';
import { mockInterviewAPI } from '../services/api';
import './MockInterviewRoom.css';

const MockInterviewRoom = ({ interviewId, onExit }) => {
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
  const [activeTab, setActiveTab] = useState('video'); // video, chat, code, whiteboard
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
      setInterview(response.data);

      // Connect to mock interview socket
      const token = localStorage.getItem('token');
      socketService.connectMockInterview(token);

      // Setup socket listeners
      setupSocketListeners();

      // Join interview room
      socketService.joinInterview(interviewId);

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
      setShowFeedbackModal(true);
    } catch (error) {
      console.error('Failed to end interview:', error);
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
            className={activeTab === 'video' ? 'active' : ''}
            onClick={() => setActiveTab('video')}
          >
            <Video size={20} />
            Video
          </button>
          <button
            className={activeTab === 'chat' ? 'active' : ''}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={20} />
            Chat
          </button>
          <button
            className={activeTab === 'code' ? 'active' : ''}
            onClick={() => setActiveTab('code')}
          >
            <Code size={20} />
            Code
          </button>
        </div>

        {/* Tab Content */}
        <div className="panel-content">
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
          onClose={() => {
            setShowFeedbackModal(false);
            onExit();
          }}
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

export default MockInterviewRoom;
