import mongoose from 'mongoose';

const InterviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['frontend', 'backend', 'dsa', 'system-design', 'behavioral'],
    required: true,
  },
  mode: {
    type: String,
    enum: ['live', 'async'],
    required: true,
  },
  interviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Only required for live interviews
  },
  scheduledAt: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number, // in minutes
    required: true,
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'missed'],
    default: 'scheduled',
  },
  meetingLink: {
    type: String,
    // Generated for live interviews
  },
  roomId: {
    type: String,
    // WebRTC room ID
  },
  questions: [{
    questionText: String,
    questionType: {
      type: String,
      enum: ['behavioral', 'technical', 'system-design', 'coding'],
    },
    timeLimit: Number, // seconds
    answered: {
      type: Boolean,
      default: false,
    },
  }],
  videoRecordings: [{
    questionId: Number,
    storageUrl: String,
    duration: Number, // seconds
    uploadedAt: Date,
    transcription: String,
    aiAnalysis: {
      clarity: Number, // 0-100
      confidence: Number, // 0-100
      technicalAccuracy: Number, // 0-100
      communication: Number, // 0-100
      overallScore: Number, // 0-100
      strengths: [String],
      improvements: [String],
    },
  }],
  // Rubric-based evaluation
  rubricScores: {
    problemSolving: {
      type: Number,
      min: 0,
      max: 10,
    },
    communication: {
      type: Number,
      min: 0,
      max: 10,
    },
    technicalKnowledge: {
      type: Number,
      min: 0,
      max: 10,
    },
    clarity: {
      type: Number,
      min: 0,
      max: 10,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 10,
    },
  },
  overallFeedback: {
    type: String,
  },
  readinessScore: {
    type: Number, // 0-100
  },
  completedAt: {
    type: Date,
  },
  reminders: {
    twentyFourHourSent: {
      type: Boolean,
      default: false,
    },
    oneHourSent: {
      type: Boolean,
      default: false,
    },
  },
}, {
  timestamps: true,
});

// Index for efficient querying
InterviewSchema.index({ userId: 1, scheduledAt: -1 });
InterviewSchema.index({ status: 1, scheduledAt: 1 });

const Interview = mongoose.model('Interview', InterviewSchema);

export default Interview;
