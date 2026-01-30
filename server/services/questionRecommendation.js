/**
 * Adaptive Question Selector Service
 * ML-based question recommendation system
 * 
 * Algorithm: Hybrid approach combining:
 * 1. Content-based filtering (topic, difficulty, type)
 * 2. Collaborative filtering (similar users)
 * 3. Multi-armed bandit (exploration vs exploitation)
 * 4. Personalized difficulty calibration
 */

import Question from '../models/Question.js';
import Progress from '../models/Progress.js';
import QuestionRecommendation from '../models/QuestionRecommendation.js';
import LearningBehavior from '../models/LearningBehavior.js';

/**
 * Generate personalized question recommendations
 * @param {String} userId - User ID
 * @param {Number} count - Number of recommendations to generate
 * @returns {Array} Array of recommended questions with scores
 */
async function generateRecommendations(userId, count = 10) {
  try {
    // 1. Get or create user recommendation profile
    let profile = await QuestionRecommendation.findOne({ userId });
    if (!profile) {
      profile = await initializeUserProfile(userId);
    }
    
    // 2. Check if recommendations need update
    if (profile.shouldUpdateRecommendations()) {
      await updateRecommendations(profile, count);
    }
    
    // 3. Return top recommendations
    const recommendations = profile.recommendationQueue
      .filter(r => !r.presented)
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
    
    return recommendations;
    
  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw error;
  }
}

/**
 * Initialize user recommendation profile
 */
async function initializeUserProfile(userId) {
  const progress = await Progress.find({ userId }).populate('questionId');
  
  const profile = new QuestionRecommendation({
    userId,
    interactionHistory: progress.map(p => ({
      questionId: p.questionId._id,
      timestamp: p.solvedAt || p.createdAt,
      isCorrect: p.isCorrect,
      timeSpent: p.timeSpent || 0,
      attemptNumber: p.attempts || 1,
      difficulty: p.questionId.difficulty,
      topic: p.questionId.topic,
      skipped: false
    })),
    contentProfile: {
      topicPreferences: new Map(),
      difficultyPreference: { easy: 0.33, medium: 0.34, hard: 0.33 },
      questionTypePreferences: new Map()
    },
    collaborativeFeatures: {
      similarUsers: [],
      userCluster: { clusterId: -1, clusterCenter: [], lastAssigned: null }
    },
    adaptiveParams: {
      optimalDifficulty: 0.5,
      learningRate: 0.05,
      explorationFactor: 0.2,
      diversityWeight: 0.3
    },
    performanceMetrics: {
      overallAccuracy: 0,
      accuracyByDifficulty: { easy: 0, medium: 0, hard: 0 },
      avgTimeByDifficulty: { easy: 0, medium: 0, hard: 0 },
      strengthTopics: [],
      weaknessTopics: [],
      improvementRate: 0
    },
    recommendationQueue: []
  });
  
  // Calculate initial metrics
  await calculatePerformanceMetrics(profile);
  await calculateContentProfile(profile);
  
  await profile.save();
  return profile;
}

/**
 * Update recommendations using hybrid algorithm
 */
async function updateRecommendations(profile, count = 10) {
  // 1. Get candidate questions (not attempted recently)
  const attemptedQuestionIds = profile.interactionHistory.map(h => h.questionId);
  const candidates = await Question.find({
    _id: { $nin: attemptedQuestionIds }
  }).limit(500); // Limit for performance
  
  // 2. Calculate scores for each candidate
  const scoredQuestions = [];
  
  for (const question of candidates) {
    const contentScore = calculateContentBasedScore(profile, question);
    const collaborativeScore = await calculateCollaborativeScore(profile, question);
    const diversityScore = calculateDiversityScore(profile, question);
    const noveltyScore = calculateNoveltyScore(profile, question);
    
    // Weighted combination
    const finalScore = 
      (contentScore * 0.4) +
      (collaborativeScore * 0.25) +
      (diversityScore * profile.adaptiveParams.diversityWeight) +
      (noveltyScore * profile.adaptiveParams.explorationFactor);
    
    // Determine recommendation reason
    const reason = getRecommendationReason(contentScore, collaborativeScore, diversityScore, noveltyScore);
    
    scoredQuestions.push({
      questionId: question._id,
      score: finalScore,
      reason,
      recommendedAt: new Date()
    });
  }
  
  // 3. Sort and select top recommendations
  scoredQuestions.sort((a, b) => b.score - a.score);
  const topRecommendations = scoredQuestions.slice(0, count * 2); // Generate 2x for buffer
  
  // 4. Update profile
  profile.recommendationQueue = topRecommendations;
  profile.lastRecommendationUpdate = new Date();
  profile.totalRecommendationsGenerated += topRecommendations.length;
  
  await profile.save();
}

/**
 * Content-based filtering score
 * Based on topic preferences, difficulty match, and question type
 */
function calculateContentBasedScore(profile, question) {
  let score = 0;
  
  // 1. Topic preference (0.4 weight)
  const topicPref = profile.contentProfile.topicPreferences.get(question.topic);
  if (topicPref) {
    score += (topicPref.interest * 0.2 + (1 - topicPref.proficiency) * 0.2); // Prefer topics of interest + need practice
  } else {
    score += 0.15; // New topic, moderate score
  }
  
  // 2. Difficulty match (0.4 weight)
  const difficultyScore = calculateDifficultyMatch(profile, question.difficulty);
  score += difficultyScore * 0.4;
  
  // 3. Question type preference (0.2 weight)
  const typePref = profile.contentProfile.questionTypePreferences.get(question.type || 'general');
  score += (typePref || 0.5) * 0.2;
  
  return Math.min(1, score);
}

/**
 * Calculate difficulty match score
 * Uses optimal difficulty and performance history
 */
function calculateDifficultyMatch(profile, difficulty) {
  const difficultyMap = { 'Easy': 0, 'Medium': 0.5, 'Hard': 1 };
  const questionDifficulty = difficultyMap[difficulty] || 0.5;
  const optimalDifficulty = profile.adaptiveParams.optimalDifficulty;
  
  // Calculate distance from optimal
  const distance = Math.abs(questionDifficulty - optimalDifficulty);
  
  // Gaussian-like curve: peak at optimal, decrease with distance
  return Math.exp(-(distance * distance) / 0.2);
}

/**
 * Collaborative filtering score
 * Based on what similar users found helpful
 */
async function calculateCollaborativeScore(profile, question) {
  if (profile.collaborativeFeatures.similarUsers.length === 0) {
    return 0.5; // No collaborative data, neutral score
  }
  
  // Find how similar users performed on this question
  const similarUserIds = profile.collaborativeFeatures.similarUsers
    .slice(0, 10) // Top 10 similar users
    .map(u => u.userId);
  
  const similarUsersProgress = await Progress.find({
    userId: { $in: similarUserIds },
    questionId: question._id
  });
  
  if (similarUsersProgress.length === 0) {
    return 0.5; // No data
  }
  
  // Calculate weighted average accuracy
  const totalWeight = profile.collaborativeFeatures.similarUsers
    .slice(0, 10)
    .reduce((sum, u) => sum + u.similarity, 0);
  
  let weightedAccuracy = 0;
  similarUsersProgress.forEach(p => {
    const userSimilarity = profile.collaborativeFeatures.similarUsers
      .find(u => u.userId.toString() === p.userId.toString());
    if (userSimilarity && p.isCorrect) {
      weightedAccuracy += userSimilarity.similarity;
    }
  });
  
  // Normalize
  const score = totalWeight > 0 ? weightedAccuracy / totalWeight : 0.5;
  
  // Prefer questions similar users found challenging but solved (sweet spot)
  const avgAccuracy = similarUsersProgress.filter(p => p.isCorrect).length / similarUsersProgress.length;
  if (avgAccuracy >= 0.4 && avgAccuracy <= 0.7) {
    return Math.min(1, score * 1.2); // Boost score
  }
  
  return score;
}

/**
 * Diversity score
 * Encourages variety in recommendations
 */
function calculateDiversityScore(profile, question) {
  // Recent topics
  const recentTopics = profile.interactionHistory
    .slice(-10)
    .map(h => h.topic)
    .filter(Boolean);
  
  // Penalize if topic appears frequently in recent history
  const topicFrequency = recentTopics.filter(t => t === question.topic).length / recentTopics.length;
  
  return 1 - topicFrequency;
}

/**
 * Novelty score (exploration)
 * Encourages trying new question types/topics
 */
function calculateNoveltyScore(profile, question) {
  const hasAttemptedTopic = profile.contentProfile.topicPreferences.has(question.topic);
  const hasAttemptedType = profile.contentProfile.questionTypePreferences.has(question.type || 'general');
  
  let novelty = 0;
  if (!hasAttemptedTopic) novelty += 0.5;
  if (!hasAttemptedType) novelty += 0.5;
  
  return novelty;
}

/**
 * Determine recommendation reason
 */
function getRecommendationReason(contentScore, collabScore, diversityScore, noveltyScore) {
  const scores = [
    { name: 'Matches your learning style', score: contentScore },
    { name: 'Similar learners found this helpful', score: collabScore },
    { name: 'Adds variety to your practice', score: diversityScore },
    { name: 'Explore new topics', score: noveltyScore }
  ];
  
  scores.sort((a, b) => b.score - a.score);
  return scores[0].name;
}

/**
 * Calculate performance metrics from history
 */
async function calculatePerformanceMetrics(profile) {
  const history = profile.interactionHistory;
  
  if (history.length === 0) {
    return;
  }
  
  // Overall accuracy
  const correct = history.filter(h => h.isCorrect).length;
  profile.performanceMetrics.overallAccuracy = (correct / history.length) * 100;
  
  // Accuracy by difficulty
  ['Easy', 'Medium', 'Hard'].forEach(diff => {
    const diffQuestions = history.filter(h => h.difficulty === diff);
    if (diffQuestions.length > 0) {
      const diffCorrect = diffQuestions.filter(h => h.isCorrect).length;
      profile.performanceMetrics.accuracyByDifficulty[diff.toLowerCase()] = 
        (diffCorrect / diffQuestions.length) * 100;
    }
  });
  
  // Avg time by difficulty
  ['Easy', 'Medium', 'Hard'].forEach(diff => {
    const diffQuestions = history.filter(h => h.difficulty === diff && h.timeSpent > 0);
    if (diffQuestions.length > 0) {
      const avgTime = diffQuestions.reduce((sum, h) => sum + h.timeSpent, 0) / diffQuestions.length;
      profile.performanceMetrics.avgTimeByDifficulty[diff.toLowerCase()] = avgTime;
    }
  });
  
  // Topic strengths and weaknesses
  const topicPerformance = {};
  history.forEach(h => {
    if (!topicPerformance[h.topic]) {
      topicPerformance[h.topic] = { correct: 0, total: 0 };
    }
    topicPerformance[h.topic].total++;
    if (h.isCorrect) topicPerformance[h.topic].correct++;
  });
  
  const topicAccuracies = Object.entries(topicPerformance).map(([topic, perf]) => ({
    topic,
    accuracy: (perf.correct / perf.total) * 100,
    count: perf.total
  }));
  
  profile.performanceMetrics.strengthTopics = topicAccuracies
    .filter(t => t.accuracy >= 70 && t.count >= 5)
    .map(t => t.topic);
  
  profile.performanceMetrics.weaknessTopics = topicAccuracies
    .filter(t => t.accuracy < 50 && t.count >= 3)
    .map(t => t.topic);
  
  // Improvement rate
  if (history.length >= 7) {
    const lastWeek = history.slice(-7);
    profile.performanceMetrics.improvementRate = lastWeek.length / 7;
  }
}

/**
 * Calculate content profile (topic preferences, difficulty preference)
 */
async function calculateContentProfile(profile) {
  const history = profile.interactionHistory;
  
  // Topic preferences
  const topicData = {};
  history.forEach(h => {
    if (!topicData[h.topic]) {
      topicData[h.topic] = { attempts: 0, correct: 0, totalTime: 0, lastAttempt: null };
    }
    topicData[h.topic].attempts++;
    if (h.isCorrect) topicData[h.topic].correct++;
    topicData[h.topic].totalTime += h.timeSpent || 0;
    topicData[h.topic].lastAttempt = h.timestamp;
  });
  
  Object.entries(topicData).forEach(([topic, data]) => {
    const proficiency = data.attempts > 0 ? data.correct / data.attempts : 0;
    const interest = Math.min(1, data.attempts / 10); // Interest grows with attempts
    
    profile.contentProfile.topicPreferences.set(topic, {
      interest,
      proficiency,
      recentActivity: data.lastAttempt
    });
  });
  
  // Difficulty preference (current performance level)
  const accuracyByDiff = profile.performanceMetrics.accuracyByDifficulty;
  const easyAcc = accuracyByDiff.easy || 0;
  const mediumAcc = accuracyByDiff.medium || 0;
  const hardAcc = accuracyByDiff.hard || 0;
  
  // Normalize to sum to 1
  const total = easyAcc + mediumAcc + hardAcc;
  if (total > 0) {
    profile.contentProfile.difficultyPreference = {
      easy: easyAcc / total,
      medium: mediumAcc / total,
      hard: hardAcc / total
    };
  }
  
  // Update optimal difficulty
  if (mediumAcc >= 60) {
    profile.adaptiveParams.optimalDifficulty = 0.7; // Lean towards hard
  } else if (mediumAcc >= 40) {
    profile.adaptiveParams.optimalDifficulty = 0.5; // Medium
  } else {
    profile.adaptiveParams.optimalDifficulty = 0.3; // Lean towards easy
  }
}

/**
 * Record user interaction with a question
 */
async function recordInteraction(userId, questionId, interaction) {
  const profile = await QuestionRecommendation.findOne({ userId });
  if (!profile) return;
  
  // Add to history
  profile.interactionHistory.push({
    questionId,
    timestamp: new Date(),
    isCorrect: interaction.isCorrect,
    timeSpent: interaction.timeSpent,
    attemptNumber: interaction.attemptNumber || 1,
    difficulty: interaction.difficulty,
    topic: interaction.topic,
    userRating: interaction.userRating,
    skipped: interaction.skipped || false
  });
  
  // Mark recommendation as presented if it was in queue
  profile.markRecommendationPresented(questionId);
  
  // Recalculate metrics
  await calculatePerformanceMetrics(profile);
  await calculateContentProfile(profile);
  
  await profile.save();
}

/**
 * Get next question recommendation
 */
async function getNextQuestion(userId) {
  const profile = await QuestionRecommendation.findOne({ userId });
  if (!profile) {
    const newProfile = await initializeUserProfile(userId);
    await updateRecommendations(newProfile, 10);
    return newProfile.getNextRecommendation();
  }
  
  if (profile.shouldUpdateRecommendations()) {
    await updateRecommendations(profile, 10);
  }
  
  return profile.getNextRecommendation();
}

export {
  generateRecommendations,
  recordInteraction,
  getNextQuestion,
  initializeUserProfile
};
