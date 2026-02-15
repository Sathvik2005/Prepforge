import mongoose from 'mongoose';

/**
 * Comprehensive User Activity Tracking Service
 * Tracks all user interactions in real-time
 */

const UserActivity = mongoose.model('UserActivity', new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // Store as string (MongoDB ObjectId)
  sessionId: { type: String, required: true, index: true },
  activityType: { 
    type: String, 
    enum: [
      'page_view', 'question_solved', 'question_attempted', 'code_run', 
      'mock_interview', 'roadmap_generated', 'roadmap_milestone_completed',
      'practice_session', 'login', 'logout', 'profile_update',
      'dsa_sheet_opened', 'test_case_run', 'hint_viewed', 'solution_viewed',
      'focus_mode_started', 'focus_mode_ended', 'research_query',
      'collaboration_joined', 'collaboration_left', 'video_interview',
      'async_interview', 'analytics_viewed', 'export_performed'
    ],
    required: true,
    index: true
  },
  metadata: {
    pageUrl: String,
    questionId: String,
    questionDifficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    codeLanguage: String,
    timeSpent: Number, // seconds
    score: Number,
    success: Boolean,
    errorCount: Number,
    hintsUsed: Number,
    testCasesPassed: Number,
    testCasesTotal: Number,
    roadmapId: String,
    milestoneId: String,
    interviewId: String,
    collaborationRoomId: String,
    searchQuery: String,
    exportFormat: String,
    customData: mongoose.Schema.Types.Mixed
  },
  timestamp: { type: Date, default: Date.now, index: true },
  duration: { type: Number, default: 0 }, // milliseconds
  deviceInfo: {
    userAgent: String,
    platform: String,
    browser: String,
    screenResolution: String
  }
}, {
  timestamps: true,
  collection: 'user_activities'
}));

const UserMetrics = mongoose.model('UserMetrics', new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true }, // Store as string (MongoDB ObjectId)
  
  // Overall Stats
  totalActivities: { type: Number, default: 0 },
  totalTimeSpent: { type: Number, default: 0 }, // seconds
  totalSessions: { type: Number, default: 0 },
  lastActiveAt: { type: Date, default: Date.now },
  accountCreatedAt: { type: Date, default: Date.now },
  
  // Problem Solving Stats
  problemsSolved: { type: Number, default: 0 },
  problemsAttempted: { type: Number, default: 0 },
  easyProblems: { type: Number, default: 0 },
  mediumProblems: { type: Number, default: 0 },
  hardProblems: { type: Number, default: 0 },
  successRate: { type: Number, default: 0 }, // percentage
  averageTimePerProblem: { type: Number, default: 0 }, // seconds
  
  // Code Execution Stats
  codeExecutions: { type: Number, default: 0 },
  testCasesPassed: { type: Number, default: 0 },
  testCasesFailed: { type: Number, default: 0 },
  languagesUsed: [{ language: String, count: Number }],
  
  // Interview Stats
  mockInterviewsCompleted: { type: Number, default: 0 },
  videoInterviewsCompleted: { type: Number, default: 0 },
  asyncInterviewsCompleted: { type: Number, default: 0 },
  averageInterviewScore: { type: Number, default: 0 },
  
  // Learning Stats
  roadmapsGenerated: { type: Number, default: 0 },
  milestonesCompleted: { type: Number, default: 0 },
  focusModeSessions: { type: Number, default: 0 },
  totalFocusTime: { type: Number, default: 0 }, // seconds
  hintsViewed: { type: Number, default: 0 },
  solutionsViewed: { type: Number, default: 0 },
  
  // Engagement Stats
  dailyStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  activeDays: { type: Number, default: 0 },
  lastStreakDate: Date,
  
  // Collaboration Stats
  collaborationSessions: { type: Number, default: 0 },
  collaborationTimeSpent: { type: Number, default: 0 },
  
  // Research & Export Stats
  researchQueriesMade: { type: Number, default: 0 },
  exportsGenerated: { type: Number, default: 0 },
  
  // Weekly/Monthly Aggregates
  weeklyStats: {
    activeDays: { type: Number, default: 0 },
    problemsSolved: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 },
    weekStartDate: Date
  },
  monthlyStats: {
    activeDays: { type: Number, default: 0 },
    problemsSolved: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 },
    monthStartDate: Date
  },
  
  // Performance Trends (last 30 days)
  performanceTrend: [{
    date: Date,
    problemsSolved: Number,
    timeSpent: Number,
    score: Number
  }],
  
  // Skill Levels
  skillLevels: [{
    category: { type: String, enum: ['algorithms', 'data-structures', 'system-design', 'frontend', 'backend', 'ml', 'devops'] },
    level: { type: Number, min: 0, max: 100 },
    problemsSolved: Number,
    lastUpdated: Date
  }],
  
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'user_metrics'
}));

/**
 * Track user activity
 */
export async function trackActivity(userId, activityType, metadata = {}, duration = 0) {
  try {
    const sessionId = metadata.sessionId || `session-${Date.now()}`;
    
    const activity = new UserActivity({
      userId,
      sessionId,
      activityType,
      metadata,
      duration,
      deviceInfo: metadata.deviceInfo || {}
    });
    
    await activity.save();
    
    // Update metrics asynchronously
    updateUserMetrics(userId, activityType, metadata, duration).catch(err => 
      console.error('Error updating metrics:', err)
    );
    
    return activity;
  } catch (error) {
    console.error('Error tracking activity:', error);
    throw error;
  }
}

/**
 * Update user metrics based on activity
 */
async function updateUserMetrics(userId, activityType, metadata, duration) {
  try {
    let metrics = await UserMetrics.findOne({ userId });
    
    if (!metrics) {
      metrics = new UserMetrics({ userId, accountCreatedAt: new Date() });
    }
    
    // Update basic stats
    metrics.totalActivities += 1;
    metrics.totalTimeSpent += Math.floor(duration / 1000);
    metrics.lastActiveAt = new Date();
    
    // Update streak
    updateStreak(metrics);
    
    // Update weekly/monthly stats
    updatePeriodStats(metrics, duration);
    
    // Activity-specific updates
    switch (activityType) {
      case 'question_solved':
        metrics.problemsSolved += 1;
        metrics.problemsAttempted += 1;
        
        if (metadata.questionDifficulty === 'easy') metrics.easyProblems += 1;
        else if (metadata.questionDifficulty === 'medium') metrics.mediumProblems += 1;
        else if (metadata.questionDifficulty === 'hard') metrics.hardProblems += 1;
        
        metrics.successRate = (metrics.problemsSolved / metrics.problemsAttempted) * 100;
        
        if (metadata.timeSpent) {
          metrics.averageTimePerProblem = 
            ((metrics.averageTimePerProblem * (metrics.problemsSolved - 1)) + metadata.timeSpent) / metrics.problemsSolved;
        }
        
        // Update skill levels
        if (metadata.category) {
          updateSkillLevel(metrics, metadata.category);
        }
        break;
        
      case 'question_attempted':
        metrics.problemsAttempted += 1;
        break;
        
      case 'code_run':
        metrics.codeExecutions += 1;
        if (metadata.testCasesPassed) metrics.testCasesPassed += metadata.testCasesPassed;
        if (metadata.testCasesTotal && metadata.testCasesPassed) {
          metrics.testCasesFailed += (metadata.testCasesTotal - metadata.testCasesPassed);
        }
        
        if (metadata.codeLanguage) {
          const langIndex = metrics.languagesUsed.findIndex(l => l.language === metadata.codeLanguage);
          if (langIndex >= 0) {
            metrics.languagesUsed[langIndex].count += 1;
          } else {
            metrics.languagesUsed.push({ language: metadata.codeLanguage, count: 1 });
          }
        }
        break;
        
      case 'mock_interview':
        metrics.mockInterviewsCompleted += 1;
        if (metadata.score) {
          metrics.averageInterviewScore = 
            ((metrics.averageInterviewScore * (metrics.mockInterviewsCompleted - 1)) + metadata.score) / metrics.mockInterviewsCompleted;
        }
        break;
        
      case 'video_interview':
        metrics.videoInterviewsCompleted += 1;
        break;
        
      case 'async_interview':
        metrics.asyncInterviewsCompleted += 1;
        break;
        
      case 'roadmap_generated':
        metrics.roadmapsGenerated += 1;
        break;
        
      case 'roadmap_milestone_completed':
        metrics.milestonesCompleted += 1;
        break;
        
      case 'focus_mode_started':
        metrics.focusModeSessions += 1;
        break;
        
      case 'focus_mode_ended':
        if (metadata.timeSpent) {
          metrics.totalFocusTime += metadata.timeSpent;
        }
        break;
        
      case 'hint_viewed':
        metrics.hintsViewed += 1;
        break;
        
      case 'solution_viewed':
        metrics.solutionsViewed += 1;
        break;
        
      case 'collaboration_joined':
        metrics.collaborationSessions += 1;
        break;
        
      case 'collaboration_left':
        if (metadata.timeSpent) {
          metrics.collaborationTimeSpent += metadata.timeSpent;
        }
        break;
        
      case 'research_query':
        metrics.researchQueriesMade += 1;
        break;
        
      case 'export_performed':
        metrics.exportsGenerated += 1;
        break;
    }
    
    // Update performance trend
    updatePerformanceTrend(metrics, metadata);
    
    metrics.updatedAt = new Date();
    await metrics.save();
    
    return metrics;
  } catch (error) {
    console.error('Error updating user metrics:', error);
    throw error;
  }
}

/**
 * Update daily streak
 */
function updateStreak(metrics) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastStreak = metrics.lastStreakDate ? new Date(metrics.lastStreakDate) : null;
  
  if (!lastStreak) {
    metrics.dailyStreak = 1;
    metrics.longestStreak = 1;
    metrics.activeDays = 1;
    metrics.lastStreakDate = today;
  } else {
    lastStreak.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today - lastStreak) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      // Same day, no change
      return;
    } else if (daysDiff === 1) {
      // Consecutive day
      metrics.dailyStreak += 1;
      metrics.activeDays += 1;
      metrics.lastStreakDate = today;
      
      if (metrics.dailyStreak > metrics.longestStreak) {
        metrics.longestStreak = metrics.dailyStreak;
      }
    } else {
      // Streak broken
      metrics.dailyStreak = 1;
      metrics.activeDays += 1;
      metrics.lastStreakDate = today;
    }
  }
}

/**
 * Update weekly/monthly stats
 */
function updatePeriodStats(metrics, duration) {
  const now = new Date();
  const weekStart = getWeekStart(now);
  const monthStart = getMonthStart(now);
  
  // Weekly stats
  if (!metrics.weeklyStats.weekStartDate || 
      new Date(metrics.weeklyStats.weekStartDate).getTime() !== weekStart.getTime()) {
    metrics.weeklyStats = {
      activeDays: 1,
      problemsSolved: 0,
      timeSpent: Math.floor(duration / 1000),
      weekStartDate: weekStart
    };
  } else {
    metrics.weeklyStats.timeSpent += Math.floor(duration / 1000);
  }
  
  // Monthly stats
  if (!metrics.monthlyStats.monthStartDate || 
      new Date(metrics.monthlyStats.monthStartDate).getTime() !== monthStart.getTime()) {
    metrics.monthlyStats = {
      activeDays: 1,
      problemsSolved: 0,
      timeSpent: Math.floor(duration / 1000),
      monthStartDate: monthStart
    };
  } else {
    metrics.monthlyStats.timeSpent += Math.floor(duration / 1000);
  }
}

/**
 * Update performance trend
 */
function updatePerformanceTrend(metrics, metadata) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let todayTrend = metrics.performanceTrend.find(t => 
    new Date(t.date).setHours(0, 0, 0, 0) === today.getTime()
  );
  
  if (!todayTrend) {
    todayTrend = {
      date: today,
      problemsSolved: 0,
      timeSpent: 0,
      score: 0
    };
    metrics.performanceTrend.push(todayTrend);
  }
  
  if (metadata.success) {
    todayTrend.problemsSolved += 1;
  }
  if (metadata.timeSpent) {
    todayTrend.timeSpent += metadata.timeSpent;
  }
  if (metadata.score) {
    todayTrend.score = (todayTrend.score + metadata.score) / 2;
  }
  
  // Keep only last 30 days
  if (metrics.performanceTrend.length > 30) {
    metrics.performanceTrend = metrics.performanceTrend
      .sort((a, b) => b.date - a.date)
      .slice(0, 30);
  }
}

/**
 * Update skill level
 */
function updateSkillLevel(metrics, category) {
  let skill = metrics.skillLevels.find(s => s.category === category);
  
  if (!skill) {
    skill = {
      category,
      level: 0,
      problemsSolved: 0,
      lastUpdated: new Date()
    };
    metrics.skillLevels.push(skill);
  }
  
  skill.problemsSolved += 1;
  skill.level = Math.min(100, skill.level + 1);
  skill.lastUpdated = new Date();
}

/**
 * Get metrics for user
 */
export async function getUserMetrics(userId) {
  try {
    let metrics = await UserMetrics.findOne({ userId });
    
    if (!metrics) {
      metrics = new UserMetrics({ userId });
      await metrics.save();
    }
    
    return metrics;
  } catch (error) {
    console.error('Error getting user metrics:', error);
    throw error;
  }
}

/**
 * Get user activity history
 */
export async function getUserActivityHistory(userId, options = {}) {
  const {
    activityType,
    startDate,
    endDate,
    limit = 100,
    skip = 0
  } = options;
  
  const query = { userId };
  
  if (activityType) {
    query.activityType = activityType;
  }
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  const activities = await UserActivity
    .find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
  
  return activities;
}

/**
 * Get real-time analytics
 */
export async function getRealtimeAnalytics(userId) {
  const [metrics, recentActivities, todayStats] = await Promise.all([
    getUserMetrics(userId),
    getUserActivityHistory(userId, { limit: 10 }),
    getTodayStats(userId)
  ]);
  
  return {
    metrics,
    recentActivities,
    todayStats,
    performanceScore: calculatePerformanceScore(metrics),
    recommendations: generateRecommendations(metrics)
  };
}

/**
 * Get today's stats
 */
async function getTodayStats(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const activities = await UserActivity.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: today }
      }
    },
    {
      $group: {
        _id: '$activityType',
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' }
      }
    }
  ]);
  
  return activities;
}

/**
 * Calculate performance score
 */
function calculatePerformanceScore(metrics) {
  const weights = {
    problemsSolved: 0.3,
    successRate: 0.2,
    streak: 0.15,
    focusTime: 0.15,
    interviews: 0.1,
    collaboration: 0.1
  };
  
  const score = 
    (Math.min(metrics.problemsSolved / 100, 1) * weights.problemsSolved * 100) +
    (metrics.successRate * weights.successRate) +
    (Math.min(metrics.dailyStreak / 30, 1) * weights.streak * 100) +
    (Math.min(metrics.totalFocusTime / 36000, 1) * weights.focusTime * 100) +
    (Math.min(metrics.mockInterviewsCompleted / 10, 1) * weights.interviews * 100) +
    (Math.min(metrics.collaborationSessions / 20, 1) * weights.collaboration * 100);
  
  return Math.round(score);
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(metrics) {
  const recommendations = [];
  
  if (metrics.dailyStreak === 0) {
    recommendations.push({ type: 'streak', message: 'Start your learning streak today!', priority: 'high' });
  } else if (metrics.dailyStreak < 7) {
    recommendations.push({ type: 'streak', message: `Keep going! You're on a ${metrics.dailyStreak}-day streak.`, priority: 'medium' });
  }
  
  if (metrics.problemsSolved < 10) {
    recommendations.push({ type: 'practice', message: 'Try solving more DSA problems to improve your skills.', priority: 'high' });
  }
  
  if (metrics.mockInterviewsCompleted === 0) {
    recommendations.push({ type: 'interview', message: 'Take your first mock interview to assess your readiness.', priority: 'medium' });
  }
  
  if (metrics.successRate < 50 && metrics.problemsAttempted > 5) {
    recommendations.push({ type: 'help', message: 'Consider reviewing solutions and using hints more often.', priority: 'high' });
  }
  
  if (metrics.focusModeSessions === 0) {
    recommendations.push({ type: 'focus', message: 'Try Focus Mode for distraction-free learning.', priority: 'low' });
  }
  
  return recommendations;
}

/**
 * Helper functions
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default {
  trackActivity,
  getUserMetrics,
  getUserActivityHistory,
  getRealtimeAnalytics
};
