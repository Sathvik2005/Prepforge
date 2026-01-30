/**
 * Media Model
 * 
 * Stores metadata for uploaded interview videos
 * - Links to interview sessions
 * - Tracks file location and specs
 * - Enables audit trail
 */

import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  questionId: {
    type: String,
    required: true
  },
  
  filename: {
    type: String,
    required: true
  },
  
  originalName: {
    type: String
  },
  
  filepath: {
    type: String,
    required: true,
    unique: true
  },
  
  mimeType: {
    type: String,
    required: true
  },
  
  size: {
    type: Number,
    required: true
  },
  
  duration: {
    type: Number, // in seconds
    default: 0
  },
  
  codec: {
    type: String
  },
  
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  
  metadata: {
    fieldname: String,
    encoding: String,
    destination: String,
    transcriptionStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    transcriptionText: String
  }
}, {
  timestamps: true
});

// Indexes for queries
mediaSchema.index({ sessionId: 1, questionId: 1 });
mediaSchema.index({ uploadedAt: -1 });

// Method to get file URL
mediaSchema.methods.getStreamUrl = function() {
  return `/api/media/${this._id}/stream`;
};

// Method to get metadata
mediaSchema.methods.getSummary = function() {
  return {
    id: this._id,
    sessionId: this.sessionId,
    questionId: this.questionId,
    filename: this.filename,
    size: this.size,
    duration: this.duration,
    mimeType: this.mimeType,
    uploadedAt: this.uploadedAt,
    streamUrl: this.getStreamUrl()
  };
};

const Media = mongoose.model('Media', mediaSchema);

export default Media;
