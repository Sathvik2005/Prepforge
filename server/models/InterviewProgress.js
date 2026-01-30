import mongoose from 'mongoose';

/**
 * InterviewProgress Model
 * Tracks longitudinal progress across multiple interview attempts
 * Monitors improvement, gap closure, and readiness evolution
 */

const interviewProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  targetRole: {
    type: String,
    required: true,
  },
  
  // Linked sessions
  sessions: [{
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ConversationalInterview',
    },
    date: Date,
    type: {
      type: String,
      enum: ['technical', 'behavioral', 'hr', 'coding', 'mixed'],
    },
    overallScore: Number,
    readinessScore: Number,
    duration: Number, // minutes
  }],
  
  // Score trends
  scoreTrends: {
    technical: [{
      date: Date,
      score: Number,
      sessionId: mongoose.Schema.Types.ObjectId,
    }],
    
    behavioral: [{
      date: Date,
      score: Number,
      sessionId: mongoose.Schema.Types.ObjectId,
    }],
    
    coding: [{
      date: Date,
      score: Number,
      sessionId: mongoose.Schema.Types.ObjectId,
    }],
    
    overall: [{
      date: Date,
      score: Number,
      sessionId: mongoose.Schema.Types.ObjectId,
    }],
  },
  
  // Gap tracking over time
  gapHistory: [{
    date: Date,
    totalGaps: Number,
    criticalGaps: Number,
    highGaps: Number,
    mediumGaps: Number,
    lowGaps: Number,
    closedSinceLastCheck: Number,
    newGapsIdentified: Number,
  }],
  
  // Topic mastery progression
  topicMastery: [{
    topic: String,
    category: String,
    attempts: Number,
    averageScore: Number,
    trend: {
      type: String,
      enum: ['improving', 'stable', 'declining', 'insufficient-data'],
    },
    masteryLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    },
    lastPracticed: Date,
    firstScore: Number,
    latestScore: Number,
  }],
  
  // Readiness evolution
  readinessHistory: [{
    date: Date,
    readinessScore: Number,
    readinessLevel: {
      type: String,
      enum: ['not-ready', 'needs-improvement', 'interview-ready', 'highly-confident'],
    },
    factors: {
      technicalReadiness: Number,
      communicationReadiness: Number,
      confidenceLevel: Number,
      gapCount: Number,
    },
  }],
  
  // Practice statistics
  practiceStats: {
    totalSessions: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    totalMinutes: {
      type: Number,
      default: 0,
    },
    averageSessionDuration: Number,
    consistencyStreak: Number, // consecutive days with practice
    lastPracticeDate: Date,
  },
  
  // Improvement metrics
  improvement: {
    overallImprovement: Number, // percentage
    fastestImprovingTopic: String,
    slowestImprovingTopic: String,
    mostPracticedTopic: String,
    averageImprovementRate: Number, // points per week
  },
  
  // Current status
  currentStatus: {
    readinessLevel: {
      type: String,
      enum: ['not-ready', 'needs-improvement', 'interview-ready', 'highly-confident'],
    },
    openGaps: Number,
    criticalGaps: Number,
    estimatedReadyDate: Date,
    confidenceScore: Number,
  },
}, {
  timestamps: true,
});

// Indexes
interviewProgressSchema.index({ userId: 1, targetRole: 1 });
interviewProgressSchema.index({ 'currentStatus.readinessLevel': 1 });

// Methods
interviewProgressSchema.methods.addSession = function(sessionData) {
  this.sessions.push(sessionData);
  this.practiceStats.totalSessions += 1;
  this.practiceStats.totalQuestions += sessionData.questionCount || 0;
  this.practiceStats.totalMinutes += sessionData.duration || 0;
  this.practiceStats.lastPracticeDate = new Date();
  
  // Update score trends
  const category = sessionData.type;
  if (this.scoreTrends[category]) {
    this.scoreTrends[category].push({
      date: sessionData.date,
      score: sessionData.overallScore,
      sessionId: sessionData.sessionId,
    });
  }
  
  this.scoreTrends.overall.push({
    date: sessionData.date,
    score: sessionData.overallScore,
    sessionId: sessionData.sessionId,
  });
};

interviewProgressSchema.methods.calculateReadiness = function() {
  if (this.sessions.length === 0) {
    return {
      readinessScore: 0,
      readinessLevel: 'not-ready',
    };
  }
  
  // Get recent scores (last 5 sessions)
  const recentSessions = this.sessions.slice(-5);
  const avgRecentScore = recentSessions.reduce((sum, s) => sum + s.overallScore, 0) / recentSessions.length;
  
  // Factor in gap count
  const gapPenalty = Math.min(this.currentStatus.criticalGaps * 10, 30);
  
  // Factor in improvement trend
  let trendBonus = 0;
  if (this.sessions.length >= 3) {
    const firstThree = this.sessions.slice(0, 3).reduce((sum, s) => sum + s.overallScore, 0) / 3;
    const lastThree = recentSessions.reduce((sum, s) => sum + s.overallScore, 0) / Math.min(recentSessions.length, 3);
    trendBonus = Math.max(0, (lastThree - firstThree) / 2);
  }
  
  const readinessScore = Math.min(100, Math.max(0, avgRecentScore - gapPenalty + trendBonus));
  
  let readinessLevel;
  if (readinessScore >= 80) readinessLevel = 'highly-confident';
  else if (readinessScore >= 65) readinessLevel = 'interview-ready';
  else if (readinessScore >= 40) readinessLevel = 'needs-improvement';
  else readinessLevel = 'not-ready';
  
  return { readinessScore, readinessLevel };
};

interviewProgressSchema.methods.updateTopicMastery = function(topic, category, score) {
  let topicEntry = this.topicMastery.find(t => t.topic === topic);
  
  if (!topicEntry) {
    topicEntry = {
      topic,
      category,
      attempts: 0,
      averageScore: 0,
      firstScore: score,
      latestScore: score,
      lastPracticed: new Date(),
    };
    this.topicMastery.push(topicEntry);
  }
  
  // Update statistics
  topicEntry.attempts += 1;
  topicEntry.averageScore = ((topicEntry.averageScore * (topicEntry.attempts - 1)) + score) / topicEntry.attempts;
  topicEntry.latestScore = score;
  topicEntry.lastPracticed = new Date();
  
  // Determine trend
  if (topicEntry.attempts >= 3) {
    const improvement = topicEntry.latestScore - topicEntry.firstScore;
    if (improvement > 10) topicEntry.trend = 'improving';
    else if (improvement < -10) topicEntry.trend = 'declining';
    else topicEntry.trend = 'stable';
  } else {
    topicEntry.trend = 'insufficient-data';
  }
  
  // Determine mastery level
  if (topicEntry.averageScore >= 85) topicEntry.masteryLevel = 'expert';
  else if (topicEntry.averageScore >= 70) topicEntry.masteryLevel = 'advanced';
  else if (topicEntry.averageScore >= 50) topicEntry.masteryLevel = 'intermediate';
  else topicEntry.masteryLevel = 'beginner';
};

interviewProgressSchema.methods.analyzeImprovement = function() {
  if (this.sessions.length < 2) {
    return null;
  }
  
  const first = this.sessions[0].overallScore;
  const latest = this.sessions[this.sessions.length - 1].overallScore;
  const overallImprovement = ((latest - first) / first) * 100;
  
  // Find fastest and slowest improving topics
  const topicImprovements = this.topicMastery
    .filter(t => t.attempts >= 2)
    .map(t => ({
      topic: t.topic,
      improvement: t.latestScore - t.firstScore,
      attempts: t.attempts,
    }))
    .sort((a, b) => b.improvement - a.improvement);
  
  this.improvement = {
    overallImprovement: Math.round(overallImprovement * 10) / 10,
    fastestImprovingTopic: topicImprovements[0]?.topic || 'N/A',
    slowestImprovingTopic: topicImprovements[topicImprovements.length - 1]?.topic || 'N/A',
    mostPracticedTopic: [...this.topicMastery].sort((a, b) => b.attempts - a.attempts)[0]?.topic || 'N/A',
    averageImprovementRate: overallImprovement / this.sessions.length,
  };
};

// Statics
interviewProgressSchema.statics.getOrCreate = async function(userId, targetRole) {
  let progress = await this.findOne({ userId, targetRole });
  
  if (!progress) {
    progress = new this({
      userId,
      targetRole,
      sessions: [],
      scoreTrends: {
        technical: [],
        behavioral: [],
        coding: [],
        overall: [],
      },
      gapHistory: [],
      topicMastery: [],
      readinessHistory: [],
      practiceStats: {
        totalSessions: 0,
        totalQuestions: 0,
        totalMinutes: 0,
        consistencyStreak: 0,
      },
      currentStatus: {
        readinessLevel: 'not-ready',
        openGaps: 0,
        criticalGaps: 0,
        confidenceScore: 0,
      },
    });
    await progress.save();
  }
  
  return progress;
};

export default mongoose.model('InterviewProgress', interviewProgressSchema);
