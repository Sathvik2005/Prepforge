import mongoose from 'mongoose';

/**
 * Adaptive Question Recommendation Schema
 * Stores ML-based question selection history and user preferences
 */
const questionRecommendationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // User interaction history
  interactionHistory: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    timestamp: Date,
    isCorrect: Boolean,
    timeSpent: Number, // seconds
    attemptNumber: Number,
    difficulty: String,
    topic: String,
    userRating: Number, // 1-5, optional feedback
    skipped: Boolean
  }],
  
  // Content-based features
  contentProfile: {
    // Topic preferences (learned from history)
    topicPreferences: {
      type: Map,
      of: {
        interest: Number, // 0-1
        proficiency: Number, // 0-1
        recentActivity: Date
      }
    },
    
    // Difficulty preference curve
    difficultyPreference: {
      easy: Number,   // 0-1
      medium: Number,
      hard: Number
    },
    
    // Preferred question types
    questionTypePreferences: {
      type: Map,
      of: Number // 0-1 preference score
    }
  },
  
  // Collaborative filtering features
  collaborativeFeatures: {
    // Similar users (based on performance patterns)
    similarUsers: [{
      userId: mongoose.Schema.Types.ObjectId,
      similarity: Number, // cosine similarity 0-1
      lastUpdated: Date
    }],
    
    // Cluster assignment (k-means clustering)
    userCluster: {
      clusterId: Number,
      clusterCenter: [Number], // feature vector
      lastAssigned: Date
    }
  },
  
  // Adaptive parameters (learned over time)
  adaptiveParams: {
    // Optimal difficulty level (personalized)
    optimalDifficulty: {
      type: Number,
      default: 0.5, // 0=easy, 0.5=medium, 1=hard
      min: 0,
      max: 1
    },
    
    // Learning rate (how fast user improves)
    learningRate: {
      type: Number,
      default: 0.05,
      min: 0,
      max: 1
    },
    
    // Exploration vs exploitation balance
    explorationFactor: {
      type: Number,
      default: 0.2, // 20% exploration, 80% exploitation
      min: 0,
      max: 1
    },
    
    // Question diversity weight
    diversityWeight: {
      type: Number,
      default: 0.3,
      min: 0,
      max: 1
    }
  },
  
  // Performance metrics
  performanceMetrics: {
    overallAccuracy: {
      type: Number,
      default: 0
    },
    accuracyByDifficulty: {
      easy: Number,
      medium: Number,
      hard: Number
    },
    avgTimeByDifficulty: {
      easy: Number,
      medium: Number,
      hard: Number
    },
    strengthTopics: [String],
    weaknessTopics: [String],
    improvementRate: Number // questions per week
  },
  
  // Recommendation queue (pre-computed)
  recommendationQueue: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    score: Number, // recommendation score 0-1
    reason: String, // why recommended
    recommendedAt: {
      type: Date,
      default: Date.now
    },
    presented: {
      type: Boolean,
      default: false
    },
    presentedAt: Date
  }],
  
  // Algorithm metadata
  algorithmVersion: {
    type: String,
    default: '1.0.0'
  },
  lastRecommendationUpdate: Date,
  totalRecommendationsGenerated: {
    type: Number,
    default: 0
  }
  
}, {
  timestamps: true
});

// Indexes
questionRecommendationSchema.index({ userId: 1, 'interactionHistory.questionId': 1 });
questionRecommendationSchema.index({ 'recommendationQueue.questionId': 1 });
questionRecommendationSchema.index({ lastRecommendationUpdate: 1 });

// Methods
questionRecommendationSchema.methods.getNextRecommendation = function() {
  const unPresented = this.recommendationQueue.filter(r => !r.presented);
  if (unPresented.length === 0) return null;
  
  // Sort by score descending
  unPresented.sort((a, b) => b.score - a.score);
  return unPresented[0];
};

questionRecommendationSchema.methods.markRecommendationPresented = function(questionId) {
  const rec = this.recommendationQueue.find(r => r.questionId.toString() === questionId.toString());
  if (rec) {
    rec.presented = true;
    rec.presentedAt = new Date();
  }
};

questionRecommendationSchema.methods.shouldUpdateRecommendations = function() {
  if (!this.lastRecommendationUpdate) return true;
  
  const hoursSinceUpdate = (Date.now() - this.lastRecommendationUpdate) / (1000 * 60 * 60);
  const unpresentedCount = this.recommendationQueue.filter(r => !r.presented).length;
  
  // Update if:
  // 1. More than 24 hours since last update
  // 2. Less than 5 unpresented recommendations
  return hoursSinceUpdate > 24 || unpresentedCount < 5;
};

const QuestionRecommendation = mongoose.model('QuestionRecommendation', questionRecommendationSchema);

export default QuestionRecommendation;
