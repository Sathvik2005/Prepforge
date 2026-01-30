import Analytics from '../models/Analytics.js';
import Progress from '../models/Progress.js';
import User from '../models/User.js';

/**
 * Generate or update daily analytics snapshot for a user
 */
export async function generateDailySnapshot(userId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if today's snapshot already exists
    let analytics = await Analytics.findOne({
      user: userId,
      date: { $gte: today }
    });
    
    // Fetch user data
    const progress = await Progress.find({ user: userId }).lean();
    
    // Gamification data (optional - may not exist yet)
    let gamification = null;
    try {
      // Try to import and fetch gamification data if available
      const GamificationModel = await import('../models/Gamification.js').then(m => m.default);
      gamification = await GamificationModel.findOne({ user: userId }).lean();
    } catch (error) {
      // Gamification model not available yet - skip
      console.log('Gamification data not available');
    }
    
    // Calculate practice metrics
    const practiceMetrics = calculatePracticeMetrics(progress);
    
    // Calculate topic mastery
    const topicMastery = calculateTopicMastery(progress);
    
    // Calculate performance metrics
    const performance = calculatePerformance(progress, analytics);
    
    // Identify strengths and weaknesses
    const { strengths, weaknesses } = identifyStrengthsWeaknesses(topicMastery);
    
    // Calculate predictions
    const predictions = calculatePredictions(performance, topicMastery, practiceMetrics);
    
    // Analyze study patterns
    const studyPatterns = analyzeStudyPatterns(progress);
    
    // Get rankings
    const rankings = await calculateRankings(userId, performance, topicMastery);
    
    if (analytics) {
      // Update existing snapshot
      analytics.practiceMetrics = practiceMetrics;
      analytics.topicMastery = topicMastery;
      analytics.performance = performance;
      analytics.strengths = strengths;
      analytics.weaknesses = weaknesses;
      analytics.predictions = predictions;
      analytics.studyPatterns = studyPatterns;
      analytics.rankings = rankings;
      
      if (gamification) {
        analytics.gamification = {
          points: gamification.points || 0,
          level: gamification.level || 1,
          streak: gamification.streaks?.current || 0,
          badgesEarned: gamification.badges?.length || 0
        };
      }
      
      await analytics.save();
    } else {
      // Create new snapshot
      analytics = new Analytics({
        user: userId,
        date: today,
        practiceMetrics,
        topicMastery,
        performance,
        strengths,
        weaknesses,
        predictions,
        studyPatterns,
        rankings,
        gamification: gamification ? {
          points: gamification.points || 0,
          level: gamification.level || 1,
          streak: gamification.streaks?.current || 0,
          badgesEarned: gamification.badges?.length || 0
        } : {}
      });
      
      await analytics.save();
    }
    
    return analytics;
  } catch (error) {
    console.error('Error generating daily snapshot:', error);
    throw error;
  }
}

/**
 * Calculate practice metrics from progress data
 */
function calculatePracticeMetrics(progress) {
  const metrics = {
    questionsAttempted: 0,
    questionsCorrect: 0,
    averageTimePerQuestion: 0,
    totalPracticeTime: 0,
    topicsCovered: new Set(),
    difficultiesCovered: new Set()
  };
  
  let totalTime = 0;
  let questionCount = 0;
  
  progress.forEach(p => {
    metrics.questionsAttempted++;
    if (p.isCorrect) metrics.questionsCorrect++;
    
    if (p.timeSpent) {
      totalTime += p.timeSpent;
      questionCount++;
    }
    
    if (p.topic) metrics.topicsCovered.add(p.topic);
    if (p.difficulty) metrics.difficultiesCovered.add(p.difficulty);
  });
  
  if (questionCount > 0) {
    metrics.averageTimePerQuestion = Math.round(totalTime / questionCount);
    metrics.totalPracticeTime = Math.round(totalTime / 60); // convert to minutes
  }
  
  metrics.topicsCovered = Array.from(metrics.topicsCovered);
  metrics.difficultiesCovered = Array.from(metrics.difficultiesCovered);
  
  return metrics;
}

/**
 * Calculate topic mastery scores
 */
function calculateTopicMastery(progress) {
  const topicData = new Map();
  
  progress.forEach(p => {
    if (!p.topic) return;
    
    if (!topicData.has(p.topic)) {
      topicData.set(p.topic, {
        correct: 0,
        total: 0,
        lastPracticed: p.attemptedAt
      });
    }
    
    const data = topicData.get(p.topic);
    data.total++;
    if (p.isCorrect) data.correct++;
    
    // Update last practiced if more recent
    if (p.attemptedAt > data.lastPracticed) {
      data.lastPracticed = p.attemptedAt;
    }
  });
  
  // Convert to score format
  const mastery = new Map();
  topicData.forEach((data, topic) => {
    const accuracy = (data.correct / data.total) * 100;
    
    // Apply recency bonus (decay factor for old practice)
    const daysSinceLastPractice = (Date.now() - data.lastPracticed) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.max(0.7, 1 - (daysSinceLastPractice / 90)); // 90-day decay
    
    // Apply volume factor (more questions = higher confidence in score)
    const volumeFactor = Math.min(1, data.total / 20); // 20 questions for full confidence
    
    const score = accuracy * recencyFactor * volumeFactor;
    
    mastery.set(topic, {
      score: Math.round(score),
      questionsAnswered: data.total,
      lastPracticed: data.lastPracticed
    });
  });
  
  return mastery;
}

/**
 * Calculate performance metrics
 */
function calculatePerformance(progress, previousAnalytics) {
  const recentProgress = progress.filter(p => {
    const daysSince = (Date.now() - p.attemptedAt) / (1000 * 60 * 60 * 24);
    return daysSince <= 7; // Last 7 days
  });
  
  // Accuracy
  const correct = recentProgress.filter(p => p.isCorrect).length;
  const accuracy = recentProgress.length > 0 
    ? (correct / recentProgress.length) * 100 
    : 0;
  
  // Speed (questions per hour)
  const totalTime = recentProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0);
  const speed = totalTime > 0 
    ? (recentProgress.length / (totalTime / 3600)) 
    : 0;
  
  // Consistency (coefficient of variation in daily practice)
  const dailyCounts = getDailyQuestionCounts(recentProgress);
  const consistency = calculateConsistency(dailyCounts);
  
  // Improvement (compare to previous week)
  let improvement = 0;
  if (previousAnalytics && previousAnalytics.performance) {
    improvement = ((accuracy - previousAnalytics.performance.accuracy) / 
      previousAnalytics.performance.accuracy) * 100;
  }
  
  return {
    accuracy: Math.round(accuracy * 10) / 10,
    speed: Math.round(speed * 10) / 10,
    consistency: Math.round(consistency * 10) / 10,
    improvement: Math.round(improvement * 10) / 10
  };
}

function getDailyQuestionCounts(progress) {
  const counts = {};
  progress.forEach(p => {
    const date = new Date(p.attemptedAt).toDateString();
    counts[date] = (counts[date] || 0) + 1;
  });
  return Object.values(counts);
}

function calculateConsistency(dailyCounts) {
  if (dailyCounts.length < 2) return 0;
  
  const mean = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
  const variance = dailyCounts.reduce((sum, count) => 
    sum + Math.pow(count - mean, 2), 0) / dailyCounts.length;
  const stdDev = Math.sqrt(variance);
  
  // Coefficient of variation (lower is better, so invert it)
  const cv = mean > 0 ? stdDev / mean : 1;
  return Math.max(0, 100 - (cv * 100));
}

/**
 * Identify strengths and weaknesses
 */
function identifyStrengthsWeaknesses(topicMastery) {
  const topics = Array.from(topicMastery.entries())
    .filter(([_, data]) => data.questionsAnswered >= 3); // Minimum 3 questions for consideration
  
  if (topics.length === 0) {
    return { strengths: [], weaknesses: [] };
  }
  
  // Sort by score
  const sorted = topics.sort((a, b) => b[1].score - a[1].score);
  
  const strengths = sorted.slice(0, Math.min(3, sorted.length)).map(([topic, data]) => ({
    topic,
    accuracy: data.score,
    confidence: data.questionsAnswered >= 10 ? 'high' : 'medium'
  }));
  
  const weaknesses = sorted.slice(-Math.min(3, sorted.length)).map(([topic, data]) => ({
    topic,
    accuracy: data.score,
    mistakePattern: data.score < 40 ? 'fundamental_gaps' : 'needs_more_practice',
    recommendedFocus: data.score < 60
  }));
  
  return { strengths, weaknesses };
}

/**
 * Calculate predictions
 */
function calculatePredictions(performance, topicMastery, practiceMetrics) {
  const { accuracy, improvement } = performance;
  const topicsCovered = practiceMetrics.topicsCovered.length;
  const totalTopics = 20; // Assuming 20 topics in the platform
  
  // Readiness score
  const coverage = (topicsCovered / totalTopics) * 100;
  const readinessScore = Math.round(
    accuracy * 0.5 +
    coverage * 0.3 +
    Math.max(0, improvement) * 0.2
  );
  
  // Pass probability (based on typical pass threshold of 70%)
  const passThreshold = 70;
  const distanceFromThreshold = readinessScore - passThreshold;
  const estimatedPassProbability = Math.min(100, Math.max(0, 
    50 + (distanceFromThreshold * 2)
  ));
  
  // Suggested focus areas (topics with lowest scores)
  const weakTopics = Array.from(topicMastery.entries())
    .filter(([_, data]) => data.score < 60)
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, 3)
    .map(([topic]) => topic);
  
  // Days to readiness
  const targetScore = 80;
  const daysToReadiness = improvement > 0 && readinessScore < targetScore
    ? Math.ceil((targetScore - readinessScore) / (improvement / 7))
    : readinessScore >= targetScore ? 0 : 999;
  
  // Confidence level
  const confidenceLevel = readinessScore >= 75 ? 'high' 
    : readinessScore >= 50 ? 'medium' 
    : 'low';
  
  return {
    readinessScore,
    estimatedPassProbability: Math.round(estimatedPassProbability),
    suggestedFocusAreas: weakTopics,
    daysToReadiness,
    confidenceLevel
  };
}

/**
 * Analyze study patterns
 */
function analyzeStudyPatterns(progress) {
  if (progress.length === 0) {
    return {
      preferredTime: 'unknown',
      averageSessionLength: 0,
      mostProductiveDay: 'unknown',
      studyFrequency: 0
    };
  }
  
  // Time of day analysis
  const timeSlots = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  progress.forEach(p => {
    const hour = new Date(p.attemptedAt).getHours();
    if (hour >= 5 && hour < 12) timeSlots.morning++;
    else if (hour >= 12 && hour < 17) timeSlots.afternoon++;
    else if (hour >= 17 && hour < 22) timeSlots.evening++;
    else timeSlots.night++;
  });
  
  const preferredTime = Object.entries(timeSlots)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  // Day of week analysis
  const dayAccuracy = {};
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  progress.forEach(p => {
    const day = days[new Date(p.attemptedAt).getDay()];
    if (!dayAccuracy[day]) dayAccuracy[day] = { correct: 0, total: 0 };
    dayAccuracy[day].total++;
    if (p.isCorrect) dayAccuracy[day].correct++;
  });
  
  const mostProductiveDay = Object.entries(dayAccuracy)
    .map(([day, data]) => ({ day, accuracy: data.correct / data.total }))
    .sort((a, b) => b.accuracy - a.accuracy)[0]?.day || 'unknown';
  
  // Session length (rough estimate based on time gaps)
  const sessions = identifySessions(progress);
  const averageSessionLength = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length)
    : 0;
  
  // Study frequency
  const uniqueDays = new Set(progress.map(p => 
    new Date(p.attemptedAt).toDateString()
  )).size;
  const daysSinceFirst = progress.length > 0
    ? (Date.now() - progress[0].attemptedAt) / (1000 * 60 * 60 * 24)
    : 0;
  const studyFrequency = daysSinceFirst > 0
    ? (uniqueDays / daysSinceFirst) * 7 // sessions per week
    : 0;
  
  return {
    preferredTime,
    averageSessionLength,
    mostProductiveDay,
    studyFrequency: Math.round(studyFrequency * 10) / 10
  };
}

function identifySessions(progress) {
  if (progress.length === 0) return [];
  
  const sorted = [...progress].sort((a, b) => a.attemptedAt - b.attemptedAt);
  const sessions = [];
  let currentSession = {
    start: sorted[0].attemptedAt,
    end: sorted[0].attemptedAt,
    duration: 0
  };
  
  for (let i = 1; i < sorted.length; i++) {
    const timeSinceLast = (sorted[i].attemptedAt - sorted[i - 1].attemptedAt) / (1000 * 60);
    
    if (timeSinceLast <= 30) { // Same session if within 30 minutes
      currentSession.end = sorted[i].attemptedAt;
    } else {
      // New session
      currentSession.duration = (currentSession.end - currentSession.start) / (1000 * 60);
      sessions.push(currentSession);
      currentSession = {
        start: sorted[i].attemptedAt,
        end: sorted[i].attemptedAt,
        duration: 0
      };
    }
  }
  
  // Add last session
  currentSession.duration = (currentSession.end - currentSession.start) / (1000 * 60);
  sessions.push(currentSession);
  
  return sessions;
}

/**
 * Calculate rankings/percentiles
 */
async function calculateRankings(userId, performance, topicMastery) {
  try {
    // Get all users' latest analytics
    const allAnalytics = await Analytics.aggregate([
      { $sort: { date: -1 } },
      { $group: {
        _id: '$user',
        latestAccuracy: { $first: '$performance.accuracy' },
        latestSpeed: { $first: '$performance.speed' }
      }}
    ]);
    
    if (allAnalytics.length === 0) {
      return {
        overall: 50,
        byTopic: new Map(),
        accuracy: 50,
        speed: 50
      };
    }
    
    // Calculate percentiles
    const accuracyRank = calculatePercentile(
      performance.accuracy,
      allAnalytics.map(a => a.latestAccuracy)
    );
    
    const speedRank = calculatePercentile(
      performance.speed,
      allAnalytics.map(a => a.latestSpeed)
    );
    
    const overall = Math.round((accuracyRank + speedRank) / 2);
    
    return {
      overall,
      byTopic: new Map(), // Would need topic-specific comparison data
      accuracy: accuracyRank,
      speed: speedRank
    };
  } catch (error) {
    console.error('Error calculating rankings:', error);
    return {
      overall: 50,
      byTopic: new Map(),
      accuracy: 50,
      speed: 50
    };
  }
}

function calculatePercentile(value, allValues) {
  const sorted = allValues.filter(v => v != null).sort((a, b) => a - b);
  if (sorted.length === 0) return 50;
  
  const belowCount = sorted.filter(v => v < value).length;
  return Math.round((belowCount / sorted.length) * 100);
}

/**
 * Get aggregated analytics for dashboard
 */
export async function getDashboardAnalytics(userId, days = 30) {
  try {
    await generateDailySnapshot(userId);
    
    const trends = await Analytics.getUserTrend(userId, days);
    const latest = trends[trends.length - 1] || null;
    const heatmap = await Analytics.getTopicHeatmap(userId, 90);
    const leaderboard = await Analytics.getLeaderboardPosition(userId);
    
    return {
      latest,
      trends,
      heatmap,
      leaderboard
    };
  } catch (error) {
    console.error('Error getting dashboard analytics:', error);
    throw error;
  }
}
