import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Daily metrics snapshot
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Practice metrics
  practiceMetrics: {
    questionsAttempted: { type: Number, default: 0 },
    questionsCorrect: { type: Number, default: 0 },
    averageTimePerQuestion: { type: Number, default: 0 }, // in seconds
    totalPracticeTime: { type: Number, default: 0 }, // in minutes
    topicsCovered: [{ type: String }],
    difficultiesCovered: [{ type: String }]
  },
  
  // Topic mastery (0-100 score for each topic)
  topicMastery: {
    type: Map,
    of: {
      score: { type: Number, min: 0, max: 100 },
      questionsAnswered: { type: Number, default: 0 },
      lastPracticed: { type: Date }
    }
  },
  
  // Performance trends
  performance: {
    accuracy: { type: Number, default: 0 }, // percentage
    speed: { type: Number, default: 0 }, // questions per hour
    consistency: { type: Number, default: 0 }, // variance in daily practice
    improvement: { type: Number, default: 0 } // week-over-week improvement %
  },
  
  // Strengths and weaknesses
  strengths: [{
    topic: String,
    accuracy: Number,
    confidence: Number
  }],
  
  weaknesses: [{
    topic: String,
    accuracy: Number,
    mistakePattern: String,
    recommendedFocus: Boolean
  }],
  
  // Gamification metrics
  gamification: {
    points: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak: { type: Number, default: 0 },
    badgesEarned: { type: Number, default: 0 }
  },
  
  // Predictive analytics
  predictions: {
    readinessScore: { type: Number, min: 0, max: 100 }, // overall readiness
    estimatedPassProbability: { type: Number, min: 0, max: 100 },
    suggestedFocusAreas: [{ type: String }],
    daysToReadiness: { type: Number },
    confidenceLevel: { type: String, enum: ['low', 'medium', 'high'] }
  },
  
  // Study patterns
  studyPatterns: {
    preferredTime: { type: String }, // 'morning', 'afternoon', 'evening', 'night'
    averageSessionLength: { type: Number }, // in minutes
    mostProductiveDay: { type: String },
    studyFrequency: { type: Number } // sessions per week
  },
  
  // Comparison metrics (percentile rankings)
  rankings: {
    overall: { type: Number, min: 0, max: 100 },
    byTopic: { type: Map, of: Number },
    accuracy: { type: Number, min: 0, max: 100 },
    speed: { type: Number, min: 0, max: 100 }
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
analyticsSchema.index({ user: 1, date: -1 });

// Methods
analyticsSchema.methods.calculateReadinessScore = function() {
  const accuracy = this.performance.accuracy || 0;
  const coverage = this.practiceMetrics.topicsCovered.length / 20 * 100; // assuming 20 topics
  const consistency = this.performance.consistency || 0;
  const improvement = Math.max(0, this.performance.improvement || 0);
  
  // Weighted formula
  const readiness = (
    accuracy * 0.4 +
    coverage * 0.25 +
    consistency * 0.2 +
    improvement * 0.15
  );
  
  return Math.min(100, Math.max(0, readiness));
};

analyticsSchema.methods.identifyStrengthsWeaknesses = function() {
  const topics = Array.from(this.topicMastery.entries());
  
  // Sort by score
  const sorted = topics.sort((a, b) => b[1].score - a[1].score);
  
  const strengths = sorted.slice(0, 3).map(([topic, data]) => ({
    topic,
    accuracy: data.score,
    confidence: data.questionsAnswered >= 10 ? 'high' : 'medium'
  }));
  
  const weaknesses = sorted.slice(-3).map(([topic, data]) => ({
    topic,
    accuracy: data.score,
    mistakePattern: 'needs_more_practice',
    recommendedFocus: data.score < 60
  }));
  
  return { strengths, weaknesses };
};

analyticsSchema.methods.predictDaysToReadiness = function(targetScore = 80) {
  const currentScore = this.predictions.readinessScore || 0;
  const improvement = this.performance.improvement || 1;
  
  if (currentScore >= targetScore) return 0;
  if (improvement <= 0) return 999; // No improvement trend
  
  const scoreGap = targetScore - currentScore;
  const daysNeeded = Math.ceil(scoreGap / (improvement / 7)); // weekly improvement to daily
  
  return daysNeeded;
};

// Statics
analyticsSchema.statics.getUserTrend = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    user: userId,
    date: { $gte: startDate }
  }).sort({ date: 1 }).lean();
};

analyticsSchema.statics.getTopicHeatmap = async function(userId, days = 90) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const analytics = await this.find({
    user: userId,
    date: { $gte: startDate }
  }).lean();
  
  // Aggregate topic practice frequency and performance
  const heatmap = {};
  
  analytics.forEach(entry => {
    entry.practiceMetrics.topicsCovered.forEach(topic => {
      if (!heatmap[topic]) {
        heatmap[topic] = { count: 0, totalScore: 0 };
      }
      heatmap[topic].count++;
      
      const topicData = entry.topicMastery.get(topic);
      if (topicData) {
        heatmap[topic].totalScore += topicData.score;
      }
    });
  });
  
  // Calculate averages
  Object.keys(heatmap).forEach(topic => {
    heatmap[topic].avgScore = heatmap[topic].totalScore / heatmap[topic].count;
  });
  
  return heatmap;
};

analyticsSchema.statics.getLeaderboardPosition = async function(userId) {
  const userAnalytics = await this.findOne({ user: userId }).sort({ date: -1 });
  if (!userAnalytics) return null;
  
  const allUsers = await this.aggregate([
    { $sort: { date: -1 } },
    { $group: {
      _id: '$user',
      latestScore: { $first: '$predictions.readinessScore' },
      latestPoints: { $first: '$gamification.points' }
    }},
    { $sort: { latestPoints: -1 } }
  ]);
  
  const position = allUsers.findIndex(u => u._id.toString() === userId.toString()) + 1;
  const percentile = ((allUsers.length - position) / allUsers.length) * 100;
  
  return {
    position,
    totalUsers: allUsers.length,
    percentile: Math.round(percentile)
  };
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

export default Analytics;
