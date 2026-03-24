// Socket.IO Service - Real-time communication layer
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

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
  
  joinSession(roomId, userId, userName) {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('join-room', { roomId, userId, userName });
  }

  leaveSession(roomId, userId) {
    if (this.socket?.connected) {
      this.socket.emit('leave-room', { roomId, userId });
    }
  }

  sendContentChange(roomId, content, userId, version) {
    this.socket.emit('code-change', { roomId, content, userId, version });
  }

  sendCursorMove(roomId, position, selection, userId, userName, color) {
    this.socket.emit('cursor-move', { roomId, position, selection, userId, userName, color });
  }

  sendTypingIndicator(roomId, userId, userName, isTyping) {
    this.socket.emit(isTyping ? 'typing-start' : 'typing-stop', { roomId, userId, userName });
  }

  sendChatMessage(roomId, message, userId) {
    this.socket.emit('chat-message', { roomId, message, userId });
  }

  changeLanguage(roomId, language, userId) {
    this.socket.emit('language-change', { roomId, language, userId });
  }

  // Collaboration listeners
  onContentUpdate(callback) {
    this.socket.on('code-update', callback);
    return () => this.socket.off('code-update', callback);
  }

  onCursorUpdate(callback) {
    this.socket.on('cursor-update', callback);
    return () => this.socket.off('cursor-update', callback);
  }

  onRoomState(callback) {
    this.socket.on('room-state', callback);
    return () => this.socket.off('room-state', callback);
  }

  onChatUpdate(callback) {
    this.socket.on('chat-update', callback);
    return () => this.socket.off('chat-update', callback);
  }

  onLanguageUpdate(callback) {
    this.socket.on('language-update', callback);
    return () => this.socket.off('language-update', callback);
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

  joinInterview(mockInterviewId, userId, role = 'candidate') {
    if (!this.mockInterviewSocket?.connected) {
      console.warn('Mock interview socket not connected');
      return;
    }
    this.mockInterviewSocket.emit('join_room', { mockInterviewId, userId, role });
  }

  joinAsRecruiter(mockInterviewId, userId) {
    if (!this.mockInterviewSocket?.connected) return;
    this.mockInterviewSocket.emit('recruiter_join', { mockInterviewId, userId });
  }

  leaveInterview(interviewId) {
    // Server handles leave on disconnect; nothing to emit
  }

  // WebRTC signaling (peer-to-peer via server relay)
  sendWebRTCOffer(interviewId, offer) {
    this.mockInterviewSocket?.emit('webrtc-offer', { interviewId, offer });
  }

  sendWebRTCAnswer(interviewId, answer) {
    this.mockInterviewSocket?.emit('webrtc-answer', { interviewId, answer });
  }

  sendICECandidate(interviewId, candidate) {
    this.mockInterviewSocket?.emit('webrtc-ice-candidate', { interviewId, candidate });
  }

  // Media controls (local only — server doesn't track these)
  toggleVideo(_interviewId, _enabled) { /* local UI only */ }
  toggleAudio(_interviewId, _enabled) { /* local UI only */ }
  startScreenShare(_interviewId) { /* local UI only */ }
  stopScreenShare(_interviewId) { /* local UI only */ }

  // Collaboration
  sendMessage(mockInterviewId, text) {
    this.mockInterviewSocket?.emit('chat_message', { mockInterviewId, text });
  }

  sendCodeChange(mockInterviewId, code) {
    this.mockInterviewSocket?.emit('code_change', { mockInterviewId, code });
  }

  sendWhiteboardDraw(interviewId, drawData) {
    this.mockInterviewSocket?.emit('whiteboard-draw', { interviewId, drawData });
  }

  sendRecruiterFeedback(mockInterviewId, comment, score) {
    this.mockInterviewSocket?.emit('recruiter_feedback', { mockInterviewId, comment, score });
  }

  // Interview control
  switchRoles(_interviewId) { /* not implemented on server */ }

  endInterview(mockInterviewId) {
    this.mockInterviewSocket?.emit('session_complete', { mockInterviewId });
  }

  // Mock interview listeners — event names match server emits
  onPartnerJoined(callback) {
    this.mockInterviewSocket.on('peer_joined', callback);
    return () => this.mockInterviewSocket.off('peer_joined', callback);
  }

  onPartnerLeft(callback) {
    this.mockInterviewSocket.on('peer_left', callback);
    return () => this.mockInterviewSocket.off('peer_left', callback);
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

  onVideoToggled(callback) { /* not emitted by server */ return () => {}; }
  onAudioToggled(callback) { /* not emitted by server */ return () => {}; }
  onScreenShareStarted(callback) { /* not emitted by server */ return () => {}; }
  onScreenShareStopped(callback) { /* not emitted by server */ return () => {}; }

  onMessage(callback) {
    this.mockInterviewSocket.on('chat_message', callback);
    return () => this.mockInterviewSocket.off('chat_message', callback);
  }

  onCodeChange(callback) {
    this.mockInterviewSocket.on('code_updated', callback);
    return () => this.mockInterviewSocket.off('code_updated', callback);
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
