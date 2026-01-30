import mongoose from 'mongoose';

// Learning Behavior Analytics Schema
const LearningBehaviorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  // Time patterns
  timePatterns: {
    averageTimePerQuestion: {
      type: Number,
      default: 0,
    }, // seconds
    timeByDifficulty: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
    },
    timeByTopic: {
      type: Map,
      of: Number,
      default: {},
    },
    // Time decay (cognitive fatigue)
    sessionTimeDecay: [{
      sessionId: String,
      startTime: Date,
      questionTimes: [Number], // Array of times per question in session
      fatigueDetected: Boolean,
    }],
  },
  // Reattempt patterns
  reattemptPatterns: {
    totalReattempts: {
      type: Number,
      default: 0,
    },
    reattemptRate: {
      type: Number,
      default: 0,
    }, // percentage
    topicReattempts: {
      type: Map,
      of: Number,
      default: {},
    },
    improvementAfterReattempt: {
      type: Number,
      default: 0,
    }, // percentage success rate
  },
  // Cognitive load detection
  cognitiveLoad: {
    currentLoad: {
      type: String,
      enum: ['low', 'optimal', 'high', 'overload'],
      default: 'optimal',
    },
    loadHistory: [{
      timestamp: Date,
      loadLevel: String,
      signals: {
        timeSpike: Boolean,
        rapidSwitching: Boolean,
        accuracyDrop: Boolean,
      },
    }],
    breakRecommendations: [{
      timestamp: Date,
      reason: String,
      taken: Boolean,
    }],
  },
  // Learning velocity
  learningVelocity: {
    questionsPerDay: {
      type: Number,
      default: 0,
    },
    accuracyTrend: {
      type: String,
      enum: ['improving', 'stable', 'declining'],
      default: 'stable',
    },
    velocityScore: {
      type: Number,
      default: 0,
    }, // 0-100
  },
  // Skill mastery estimation (Bayesian-inspired)
  skillMastery: {
    type: Map,
    of: {
      masteryProbability: Number, // 0-1
      confidence: Number, // 0-1
      lastUpdated: Date,
      questionsAttempted: Number,
      accuracy: Number,
      avgSpeed: Number, // seconds
      consistency: Number, // 0-1
    },
    default: {},
  },
  // Study session analytics
  studySessions: [{
    sessionId: String,
    startTime: Date,
    endTime: Date,
    questionsAttempted: Number,
    accuracy: Number,
    topics: [String],
    cognitiveLoadAtEnd: String,
  }],
  // Longitudinal progress
  longitudinalProgress: {
    weeklyProgress: [{
      week: Date,
      questionsCompleted: Number,
      averageAccuracy: Number,
      topicsImproved: [String],
      masteryGain: Number,
    }],
    projectedReadinessDate: Date,
    confidenceInterval: {
      lower: Date,
      upper: Date,
    },
  },
}, {
  timestamps: true,
});

// Note: userId already has unique:true, no need for redundant index
const LearningBehavior = mongoose.model('LearningBehavior', LearningBehaviorSchema);

export default LearningBehavior;
