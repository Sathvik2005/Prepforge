import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    status: {
      type: String,
      enum: ['solved', 'attempted', 'skipped'],
      required: true,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    timeSpent: {
      type: Number, // in seconds
      default: 0,
    },
    attempts: {
      type: Number,
      default: 1,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique user-question pairs
progressSchema.index({ userId: 1, questionId: 1 }, { unique: true });

export default mongoose.model('Progress', progressSchema);
