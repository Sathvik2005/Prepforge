import mongoose from 'mongoose';

/**
 * Smart Roadmap Schema
 * Stores AI-generated personalized learning plans
 * Adapts based on user goals, time constraints, and current skill levels
 */
const smartRoadmapSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // User goals and constraints
  goals: {
    targetRole: {
      type: String,
      required: true,
      enum: ['Frontend', 'Backend', 'FullStack', 'ML/AI', 'Data', 'DevOps', 'Cybersecurity', 'Mobile', 'QA', 'Other']
    },
    targetDate: {
      type: Date,
      required: true
    },
    weeklyHours: {
      type: Number,
      required: true,
      min: 1,
      max: 168 // Max hours in a week
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true
    },
    focusAreas: [String], // e.g., ['Arrays', 'Dynamic Programming', 'System Design']
    customGoals: String
  },
  
  // Generated roadmap
  roadmap: {
    totalDays: Number,
    totalTopics: Number,
    estimatedCompletion: Date,
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    
    // Daily plan structure
    dailyPlans: [{
      day: Number,
      date: Date,
      topics: [{
        name: String,
        difficulty: {
          type: String,
          enum: ['easy', 'medium', 'hard']
        },
        estimatedTime: Number, // minutes
        priority: {
          type: String,
          enum: ['high', 'medium', 'low']
        },
        questionIds: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question'
        }],
        resources: [String] // Learning resources URLs
      }],
      totalEstimatedTime: Number, // minutes
      isCompleted: {
        type: Boolean,
        default: false
      },
      completedAt: Date,
      actualTimeSpent: Number // minutes
    }],
    
    // Weekly milestones
    weeklyMilestones: [{
      week: Number,
      startDate: Date,
      endDate: Date,
      goals: [String],
      topicsCovered: [String],
      expectedProgress: Number, // percentage
      actualProgress: Number,
      isCompleted: Boolean
    }]
  },
  
  // Adaptive learning metrics
  adaptiveMetrics: {
    currentDay: {
      type: Number,
      default: 1
    },
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    adherenceScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    adjustmentHistory: [{
      date: Date,
      reason: String,
      changes: String,
      impact: String
    }],
    
    // Performance tracking for adaptation
    performanceMetrics: {
      avgAccuracy: Number,
      avgTimePerQuestion: Number,
      topicsStruggling: [String],
      topicsMastered: [String],
      learningVelocity: Number // questions per day
    }
  },
  
  // Algorithm metadata
  algorithmMetadata: {
    version: {
      type: String,
      default: '1.0.0'
    },
    generationMethod: {
      type: String,
      enum: ['rule-based', 'ml-optimized', 'hybrid'],
      default: 'hybrid'
    },
    factors: {
      timeConstraint: Number,
      skillGap: Number,
      learningPace: Number,
      difficultyProgression: Number
    },
    lastRegenerated: Date
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'abandoned'],
    default: 'draft'
  },
  
  // Feedback from user
  userFeedback: [{
    date: Date,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    adjustmentRequest: String
  }]
  
}, {
  timestamps: true
});

// Indexes for efficient queries
smartRoadmapSchema.index({ userId: 1, status: 1 });
smartRoadmapSchema.index({ 'goals.targetDate': 1 });
smartRoadmapSchema.index({ 'roadmap.dailyPlans.date': 1 });

// Methods
smartRoadmapSchema.methods.calculateProgress = function() {
  const completedDays = this.roadmap.dailyPlans.filter(day => day.isCompleted).length;
  const totalDays = this.roadmap.dailyPlans.length;
  return totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
};

smartRoadmapSchema.methods.calculateAdherence = function() {
  const today = new Date();
  const currentDay = this.adaptiveMetrics.currentDay;
  const expectedDay = Math.ceil((today - this.createdAt) / (1000 * 60 * 60 * 24));
  
  if (expectedDay === 0) return 100;
  return Math.max(0, Math.min(100, (currentDay / expectedDay) * 100));
};

smartRoadmapSchema.methods.getNextDayPlan = function() {
  return this.roadmap.dailyPlans.find(day => !day.isCompleted);
};

smartRoadmapSchema.methods.shouldRegenerateRoadmap = function() {
  // Regenerate if:
  // 1. Adherence drops below 50%
  // 2. User is significantly ahead/behind schedule
  // 3. Performance metrics indicate need for adjustment
  
  const adherence = this.calculateAdherence();
  const progressDelta = this.adaptiveMetrics.overallProgress - (this.adaptiveMetrics.currentDay / this.roadmap.totalDays) * 100;
  
  return adherence < 50 || Math.abs(progressDelta) > 30;
};

const SmartRoadmap = mongoose.model('SmartRoadmap', smartRoadmapSchema);

export default SmartRoadmap;
