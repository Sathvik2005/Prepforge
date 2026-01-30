import mongoose from 'mongoose';

// Collaboration Room Schema for real-time interview sessions
const CollaborationRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: true,
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['interviewer', 'candidate'],
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  // Shared code editor state
  codeDocument: {
    content: {
      type: String,
      default: '// Write your code here...\n',
    },
    language: {
      type: String,
      default: 'javascript',
      enum: ['javascript', 'python', 'java', 'cpp', 'c', 'typescript', 'go', 'rust'],
    },
    version: {
      type: Number,
      default: 0,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedAt: Date,
  },
  // Whiteboard state
  whiteboard: {
    strokes: [{
      id: String,
      type: {
        type: String,
        enum: ['path', 'circle', 'rectangle', 'text', 'arrow'],
      },
      points: [[Number]], // Array of [x, y] coordinates
      color: String,
      strokeWidth: Number,
      userId: mongoose.Schema.Types.ObjectId,
      timestamp: Date,
    }],
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedAt: Date,
  },
  // Chat messages
  chat: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isSystemMessage: {
      type: Boolean,
      default: false,
    },
  }],
  // Live cursors tracking
  cursors: {
    type: Map,
    of: {
      userId: mongoose.Schema.Types.ObjectId,
      position: {
        line: Number,
        column: Number,
      },
      selection: {
        startLine: Number,
        startColumn: Number,
        endLine: Number,
        endColumn: Number,
      },
      color: String,
      lastUpdate: Date,
    },
    default: new Map(),
  },
  // Room status
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'expired'],
    default: 'waiting',
  },
  // Recording metadata
  recording: {
    isRecording: {
      type: Boolean,
      default: false,
    },
    startedAt: Date,
    stoppedAt: Date,
    duration: Number, // in seconds
    recordingUrl: String,
  },
  // Settings
  settings: {
    allowWhiteboard: {
      type: Boolean,
      default: true,
    },
    allowChat: {
      type: Boolean,
      default: true,
    },
    allowScreenShare: {
      type: Boolean,
      default: true,
    },
    maxParticipants: {
      type: Number,
      default: 2,
    },
    autoSaveInterval: {
      type: Number,
      default: 30, // seconds
    },
  },
  // Expiry
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    },
  },
}, {
  timestamps: true,
});

// Indexes
CollaborationRoomSchema.index({ status: 1, expiresAt: 1 });
CollaborationRoomSchema.index({ 'participants.userId': 1 });

// Methods
CollaborationRoomSchema.methods.addParticipant = function(userId, role) {
  this.participants.push({
    userId,
    role,
    joinedAt: new Date(),
    isActive: true,
  });
  return this.save();
};

CollaborationRoomSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => 
    p.userId.toString() === userId.toString() && p.isActive
  );
  if (participant) {
    participant.isActive = false;
    participant.leftAt = new Date();
  }
  return this.save();
};

CollaborationRoomSchema.methods.updateCode = function(content, userId) {
  this.codeDocument.content = content;
  this.codeDocument.version += 1;
  this.codeDocument.lastModifiedBy = userId;
  this.codeDocument.lastModifiedAt = new Date();
  return this.save();
};

CollaborationRoomSchema.methods.addWhiteboardStroke = function(stroke, userId) {
  this.whiteboard.strokes.push({
    ...stroke,
    userId,
    timestamp: new Date(),
  });
  this.whiteboard.lastModifiedBy = userId;
  this.whiteboard.lastModifiedAt = new Date();
  return this.save();
};

CollaborationRoomSchema.methods.addChatMessage = function(userId, message, isSystem = false) {
  this.chat.push({
    userId,
    message,
    timestamp: new Date(),
    isSystemMessage: isSystem,
  });
  return this.save();
};

CollaborationRoomSchema.methods.getActiveParticipants = function() {
  return this.participants.filter(p => p.isActive);
};

const CollaborationRoom = mongoose.model('CollaborationRoom', CollaborationRoomSchema);

export default CollaborationRoom;
