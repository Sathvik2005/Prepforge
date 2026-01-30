// Socket.IO Service - Real-time communication layer
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.mockInterviewSocket = null;
    this.listeners = new Map();
  }

  // ===========================
  // Connection Management
  // ===========================
  
  connect(token) {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupConnectionHandlers();
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.mockInterviewSocket) {
      this.mockInterviewSocket.disconnect();
      this.mockInterviewSocket = null;
    }
  }

  setupConnectionHandlers() {
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });
  }

  // ===========================
  // Collaboration Events
  // ===========================
  
  joinSession(sessionId, userId) {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('join-session', { sessionId, userId });
  }

  leaveSession(sessionId, userId) {
    if (this.socket?.connected) {
      this.socket.emit('leave-session', { sessionId, userId });
    }
  }

  sendContentChange(sessionId, content) {
    this.socket.emit('content-change', { sessionId, content });
  }

  sendCursorMove(sessionId, position) {
    this.socket.emit('cursor-move', { sessionId, position });
  }

  sendTypingIndicator(sessionId, isTyping) {
    this.socket.emit('user-typing', { sessionId, isTyping });
  }

  addComment(sessionId, comment) {
    this.socket.emit('add-comment', { sessionId, comment });
  }

  resolveComment(sessionId, commentId) {
    this.socket.emit('resolve-comment', { sessionId, commentId });
  }

  // Collaboration listeners
  onContentUpdate(callback) {
    this.socket.on('content-updated', callback);
    return () => this.socket.off('content-updated', callback);
  }

  onCursorUpdate(callback) {
    this.socket.on('cursor-updated', callback);
    return () => this.socket.off('cursor-updated', callback);
  }

  onUserJoined(callback) {
    this.socket.on('user-joined', callback);
    return () => this.socket.off('user-joined', callback);
  }

  onUserLeft(callback) {
    this.socket.on('user-left', callback);
    return () => this.socket.off('user-left', callback);
  }

  onUserTyping(callback) {
    this.socket.on('user-typing', callback);
    return () => this.socket.off('user-typing', callback);
  }

  // ===========================
  // Mock Interview Events
  // ===========================
  
  connectMockInterview(token) {
    if (this.mockInterviewSocket?.connected) return this.mockInterviewSocket;

    this.mockInterviewSocket = io(`${SOCKET_URL}/mock-interview`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.mockInterviewSocket.on('connect', () => {
      console.log('✅ Mock Interview socket connected');
    });

    return this.mockInterviewSocket;
  }

  joinInterview(interviewId) {
    if (!this.mockInterviewSocket?.connected) {
      throw new Error('Mock interview socket not connected');
    }
    this.mockInterviewSocket.emit('join-interview', { interviewId });
  }

  leaveInterview(interviewId) {
    if (this.mockInterviewSocket?.connected) {
      this.mockInterviewSocket.emit('leave-interview', { interviewId });
    }
  }

  // WebRTC signaling
  sendWebRTCOffer(interviewId, offer) {
    this.mockInterviewSocket.emit('webrtc-offer', { interviewId, offer });
  }

  sendWebRTCAnswer(interviewId, answer) {
    this.mockInterviewSocket.emit('webrtc-answer', { interviewId, answer });
  }

  sendICECandidate(interviewId, candidate) {
    this.mockInterviewSocket.emit('webrtc-ice-candidate', { interviewId, candidate });
  }

  // Media controls
  toggleVideo(interviewId, enabled) {
    this.mockInterviewSocket.emit('toggle-video', { interviewId, enabled });
  }

  toggleAudio(interviewId, enabled) {
    this.mockInterviewSocket.emit('toggle-audio', { interviewId, enabled });
  }

  startScreenShare(interviewId) {
    this.mockInterviewSocket.emit('start-screen-share', { interviewId });
  }

  stopScreenShare(interviewId) {
    this.mockInterviewSocket.emit('stop-screen-share', { interviewId });
  }

  // Collaboration features
  sendMessage(interviewId, message) {
    this.mockInterviewSocket.emit('send-message', { interviewId, message });
  }

  sendCodeChange(interviewId, code) {
    this.mockInterviewSocket.emit('code-change', { interviewId, code });
  }

  sendWhiteboardDraw(interviewId, drawData) {
    this.mockInterviewSocket.emit('whiteboard-draw', { interviewId, drawData });
  }

  // Interview control
  switchRoles(interviewId) {
    this.mockInterviewSocket.emit('switch-roles', { interviewId });
  }

  endInterview(interviewId) {
    this.mockInterviewSocket.emit('end-interview', { interviewId });
  }

  // Mock interview listeners
  onPartnerJoined(callback) {
    this.mockInterviewSocket.on('partner-joined', callback);
    return () => this.mockInterviewSocket.off('partner-joined', callback);
  }

  onPartnerLeft(callback) {
    this.mockInterviewSocket.on('partner-left', callback);
    return () => this.mockInterviewSocket.off('partner-left', callback);
  }

  onWebRTCOffer(callback) {
    this.mockInterviewSocket.on('webrtc-offer', callback);
    return () => this.mockInterviewSocket.off('webrtc-offer', callback);
  }

  onWebRTCAnswer(callback) {
    this.mockInterviewSocket.on('webrtc-answer', callback);
    return () => this.mockInterviewSocket.off('webrtc-answer', callback);
  }

  onICECandidate(callback) {
    this.mockInterviewSocket.on('webrtc-ice-candidate', callback);
    return () => this.mockInterviewSocket.off('webrtc-ice-candidate', callback);
  }

  onVideoToggled(callback) {
    this.mockInterviewSocket.on('video-toggled', callback);
    return () => this.mockInterviewSocket.off('video-toggled', callback);
  }

  onAudioToggled(callback) {
    this.mockInterviewSocket.on('audio-toggled', callback);
    return () => this.mockInterviewSocket.off('audio-toggled', callback);
  }

  onScreenShareStarted(callback) {
    this.mockInterviewSocket.on('screen-share-started', callback);
    return () => this.mockInterviewSocket.off('screen-share-started', callback);
  }

  onScreenShareStopped(callback) {
    this.mockInterviewSocket.on('screen-share-stopped', callback);
    return () => this.mockInterviewSocket.off('screen-share-stopped', callback);
  }

  onMessage(callback) {
    this.mockInterviewSocket.on('message-received', callback);
    return () => this.mockInterviewSocket.off('message-received', callback);
  }

  onCodeChange(callback) {
    this.mockInterviewSocket.on('code-changed', callback);
    return () => this.mockInterviewSocket.off('code-changed', callback);
  }

  onWhiteboardDraw(callback) {
    this.mockInterviewSocket.on('whiteboard-draw', callback);
    return () => this.mockInterviewSocket.off('whiteboard-draw', callback);
  }

  onRolesSwitched(callback) {
    this.mockInterviewSocket.on('roles-switched', callback);
    return () => this.mockInterviewSocket.off('roles-switched', callback);
  }

  onInterviewEnded(callback) {
    this.mockInterviewSocket.on('interview-ended', callback);
    return () => this.mockInterviewSocket.off('interview-ended', callback);
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
