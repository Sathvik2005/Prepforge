import mongoose from 'mongoose';

// Question Difficulty Calibration Schema
const QuestionCalibrationSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
    unique: true,
  },
  // Calibration data
  calibration: {
    originalDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
    },
    calibratedDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
    },
    confidence: {
      type: Number, // 0-1
      default: 0.5,
    },
    lastCalibrated: Date,
  },
  // Performance statistics
  statistics: {
    totalAttempts: {
      type: Number,
      default: 0,
    },
    correctAttempts: {
      type: Number,
      default: 0,
    },
    successRate: {
      type: Number, // 0-100
      default: 0,
    },
    averageTime: {
      type: Number, // seconds
      default: 0,
    },
    completionRate: {
      type: Number, // 0-100
      default: 0,
    },
  },
  // User segments performance
  segmentPerformance: {
    beginners: {
      attempts: { type: Number, default: 0 },
      successRate: { type: Number, default: 0 },
    },
    intermediate: {
      attempts: { type: Number, default: 0 },
      successRate: { type: Number, default: 0 },
    },
    advanced: {
      attempts: { type: Number, default: 0 },
      successRate: { type: Number, default: 0 },
    },
  },
  // Recalibration triggers
  needsRecalibration: {
    type: Boolean,
    default: false,
  },
  recalibrationReason: {
    type: String,
    enum: ['drift', 'insufficient_data', 'outlier_performance', 'bias_detected'],
  },
}, {
  timestamps: true,
});

// Indexes (questionId already unique in schema, only adding compound indexes)
QuestionCalibrationSchema.index({ 'calibration.calibratedDifficulty': 1 });
QuestionCalibrationSchema.index({ needsRecalibration: 1 });

const QuestionCalibration = mongoose.model('QuestionCalibration', QuestionCalibrationSchema);

export default QuestionCalibration;
