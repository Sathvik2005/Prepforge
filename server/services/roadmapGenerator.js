/**
 * Smart Roadmap Generator Service
 * Generates adaptive, personalized learning plans using AI algorithms
 * 
 * Algorithm: Hybrid approach combining:
 * 1. Constraint-based scheduling (time, difficulty progression)
 * 2. Skill graph traversal (prerequisite dependencies)
 * 3. Personalized difficulty calibration
 * 4. Learning velocity estimation
 */

import Question from '../models/Question.js';
import Progress from '../models/Progress.js';
import LearningBehavior from '../models/LearningBehavior.js';
import SmartRoadmap from '../models/SmartRoadmap.js';

/**
 * Topic dependency graph (prerequisite relationships)
 * Used for intelligent topic ordering
 */
const TOPIC_DEPENDENCIES = {
  'Arrays': [],
  'Strings': ['Arrays'],
  'Linked List': ['Arrays'],
  'Stack': ['Arrays', 'Linked List'],
  'Queue': ['Arrays', 'Linked List'],
  'Hashing': ['Arrays'],
  'Trees': ['Linked List'],
  'Binary Search Tree': ['Trees'],
  'Heap': ['Trees'],
  'Graph': ['Trees'],
  'Recursion': ['Arrays'],
  'Backtracking': ['Recursion'],
  'Dynamic Programming': ['Recursion', 'Arrays'],
  'Greedy': ['Arrays'],
  'Sorting': ['Arrays'],
  'Searching': ['Arrays'],
  'Binary Search': ['Arrays', 'Sorting'],
  'Two Pointers': ['Arrays'],
  'Sliding Window': ['Arrays', 'Two Pointers'],
  'Bit Manipulation': ['Arrays'],
  'Math': [],
  'Tries': ['Trees', 'Strings'],
  'Segment Tree': ['Trees'],
  'Disjoint Set': ['Graph']
};

/**
 * Difficulty progression curve
 * Controls how quickly difficulty increases
 */
const DIFFICULTY_PROGRESSION = {
  beginner: {
    easy: 0.6,    // 60% easy questions
    medium: 0.3,  // 30% medium questions
    hard: 0.1     // 10% hard questions
  },
  intermediate: {
    easy: 0.3,
    medium: 0.5,
    hard: 0.2
  },
  advanced: {
    easy: 0.2,
    medium: 0.4,
    hard: 0.4
  }
};

/**
 * Generate personalized roadmap
 * @param {Object} userId - User ID
 * @param {Object} goals - User goals and constraints
 * @returns {Object} Generated roadmap
 */
async function generateRoadmap(userId, goals) {
  try {
    // 1. Analyze user's current state
    const userState = await analyzeUserState(userId);
    
    // 2. Calculate time constraints
    const timeConstraints = calculateTimeConstraints(goals);
    
    // 3. Identify skill gaps
    const skillGaps = identifySkillGaps(userState, goals);
    
    // 4. Generate topic sequence using topological sort
    const topicSequence = generateTopicSequence(skillGaps, userState);
    
    // 5. Allocate questions to days
    const dailyPlans = await allocateQuestionsToSchedule(
      topicSequence,
      timeConstraints,
      goals.experienceLevel,
      userState
    );
    
    // 6. Generate weekly milestones
    const weeklyMilestones = generateWeeklyMilestones(dailyPlans, goals);
    
    // 7. Calculate confidence score
    const confidence = calculateRoadmapConfidence(userState, timeConstraints, skillGaps);
    
    // 8. Create roadmap object
    const roadmap = new SmartRoadmap({
      userId,
      goals: {
        targetRole: goals.targetRole,
        targetDate: new Date(goals.targetDate),
        weeklyHours: goals.weeklyHours,
        experienceLevel: goals.experienceLevel,
        focusAreas: goals.focusAreas || [],
        customGoals: goals.customGoals || ''
      },
      roadmap: {
        totalDays: dailyPlans.length,
        totalTopics: topicSequence.length,
        estimatedCompletion: timeConstraints.endDate,
        confidence,
        dailyPlans,
        weeklyMilestones
      },
      adaptiveMetrics: {
        currentDay: 1,
        overallProgress: 0,
        adherenceScore: 100,
        adjustmentHistory: [],
        performanceMetrics: {
          avgAccuracy: userState.avgAccuracy || 0,
          avgTimePerQuestion: userState.avgTimePerQuestion || 0,
          topicsStruggling: userState.strugglingTopics || [],
          topicsMastered: userState.masteredTopics || [],
          learningVelocity: userState.learningVelocity || 0
        }
      },
      algorithmMetadata: {
        version: '1.0.0',
        generationMethod: 'hybrid',
        factors: {
          timeConstraint: timeConstraints.totalDays,
          skillGap: skillGaps.length,
          learningPace: userState.learningVelocity || 5,
          difficultyProgression: DIFFICULTY_PROGRESSION[goals.experienceLevel].hard
        },
        lastRegenerated: new Date()
      },
      status: 'active'
    });
    
    await roadmap.save();
    return roadmap;
    
  } catch (error) {
    console.error('Error generating roadmap:', error);
    throw error;
  }
}

/**
 * Analyze user's current learning state
 */
async function analyzeUserState(userId) {
  const progress = await Progress.find({ userId }).populate('questionId');
  const learningBehavior = await LearningBehavior.findOne({ userId });
  
  // Calculate statistics
  const totalAttempts = progress.length;
  const correctAttempts = progress.filter(p => p.isCorrect).length;
  const avgAccuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;
  
  const totalTime = progress.reduce((sum, p) => sum + (p.timeSpent || 0), 0);
  const avgTimePerQuestion = totalAttempts > 0 ? totalTime / totalAttempts : 180; // 3 minutes default
  
  // Identify mastered and struggling topics
  const topicPerformance = {};
  progress.forEach(p => {
    if (p.questionId && p.questionId.topic) {
      const topic = p.questionId.topic;
      if (!topicPerformance[topic]) {
        topicPerformance[topic] = { correct: 0, total: 0 };
      }
      topicPerformance[topic].total++;
      if (p.isCorrect) topicPerformance[topic].correct++;
    }
  });
  
  const masteredTopics = [];
  const strugglingTopics = [];
  
  Object.keys(topicPerformance).forEach(topic => {
    const accuracy = (topicPerformance[topic].correct / topicPerformance[topic].total) * 100;
    if (accuracy >= 70 && topicPerformance[topic].total >= 5) {
      masteredTopics.push(topic);
    } else if (accuracy < 50 && topicPerformance[topic].total >= 3) {
      strugglingTopics.push(topic);
    }
  });
  
  // Calculate learning velocity (questions per day)
  const learningVelocity = learningBehavior?.learningVelocity?.questionsPerDay || 5;
  
  return {
    totalAttempts,
    avgAccuracy,
    avgTimePerQuestion,
    masteredTopics,
    strugglingTopics,
    topicPerformance,
    learningVelocity
  };
}

/**
 * Calculate time constraints and scheduling parameters
 */
function calculateTimeConstraints(goals) {
  const startDate = new Date();
  const endDate = new Date(goals.targetDate);
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  const dailyHours = goals.weeklyHours / 7;
  const dailyMinutes = dailyHours * 60;
  
  return {
    startDate,
    endDate,
    totalDays,
    dailyMinutes,
    weeklyHours: goals.weeklyHours
  };
}

/**
 * Identify skill gaps based on target role
 */
function identifySkillGaps(userState, goals) {
  const roleTopicMap = {
    'Frontend': ['Arrays', 'Strings', 'Trees', 'Dynamic Programming', 'Recursion'],
    'Backend': ['Arrays', 'Strings', 'Hashing', 'Trees', 'Graph', 'Dynamic Programming', 'System Design'],
    'FullStack': ['Arrays', 'Strings', 'Trees', 'Graph', 'Dynamic Programming', 'System Design'],
    'ML/AI': ['Arrays', 'Math', 'Dynamic Programming', 'Graph', 'Greedy'],
    'Data': ['Arrays', 'Hashing', 'Sorting', 'Trees', 'Graph'],
    'DevOps': ['Arrays', 'Strings', 'Graph', 'System Design'],
    'Cybersecurity': ['Arrays', 'Strings', 'Bit Manipulation', 'Hashing'],
    'Mobile': ['Arrays', 'Strings', 'Trees', 'Dynamic Programming'],
    'QA': ['Arrays', 'Strings', 'Graph'],
    'Other': ['Arrays', 'Strings', 'Trees', 'Graph', 'Dynamic Programming']
  };
  
  const requiredTopics = roleTopicMap[goals.targetRole] || roleTopicMap['Other'];
  const masteredTopics = userState.masteredTopics || [];
  
  // Focus areas override
  if (goals.focusAreas && goals.focusAreas.length > 0) {
    return goals.focusAreas.filter(topic => !masteredTopics.includes(topic));
  }
  
  return requiredTopics.filter(topic => !masteredTopics.includes(topic));
}

/**
 * Generate optimal topic sequence using topological sort
 * Respects prerequisite dependencies
 */
function generateTopicSequence(skillGaps, userState) {
  const visited = new Set(userState.masteredTopics || []);
  const sequence = [];
  
  function canLearn(topic) {
    const prerequisites = TOPIC_DEPENDENCIES[topic] || [];
    return prerequisites.every(prereq => visited.has(prereq));
  }
  
  function dfs(availableTopics) {
    const learnable = availableTopics.filter(topic => canLearn(topic) && !visited.has(topic));
    
    if (learnable.length === 0) return;
    
    // Prioritize struggling topics, then new topics
    learnable.sort((a, b) => {
      const aStruggling = userState.strugglingTopics?.includes(a) ? -1 : 0;
      const bStruggling = userState.strugglingTopics?.includes(b) ? -1 : 0;
      return aStruggling - bStruggling;
    });
    
    for (const topic of learnable) {
      visited.add(topic);
      sequence.push(topic);
      dfs(availableTopics);
    }
  }
  
  dfs(skillGaps);
  
  return sequence;
}

/**
 * Allocate questions to daily schedule
 */
async function allocateQuestionsToSchedule(topicSequence, timeConstraints, experienceLevel, userState) {
  const dailyPlans = [];
  const difficultyDistribution = DIFFICULTY_PROGRESSION[experienceLevel];
  
  let currentDate = new Date(timeConstraints.startDate);
  let dayNumber = 1;
  
  for (const topic of topicSequence) {
    // Fetch questions for this topic
    const easyCount = Math.ceil(5 * difficultyDistribution.easy);
    const mediumCount = Math.ceil(5 * difficultyDistribution.medium);
    const hardCount = Math.ceil(5 * difficultyDistribution.hard);
    
    const easyQuestions = await Question.find({ topic, difficulty: 'Easy' }).limit(easyCount);
    const mediumQuestions = await Question.find({ topic, difficulty: 'Medium' }).limit(mediumCount);
    const hardQuestions = await Question.find({ topic, difficulty: 'Hard' }).limit(hardCount);
    
    const allQuestions = [...easyQuestions, ...mediumQuestions, ...hardQuestions];
    
    // Estimate time based on difficulty
    const estimatedTime = allQuestions.reduce((sum, q) => {
      const baseTime = { 'Easy': 15, 'Medium': 25, 'Hard': 40 }[q.difficulty] || 20;
      return sum + baseTime;
    }, 0);
    
    // Check if fits in daily time budget
    if (estimatedTime <= timeConstraints.dailyMinutes) {
      // Single day plan
      dailyPlans.push({
        day: dayNumber++,
        date: new Date(currentDate),
        topics: [{
          name: topic,
          difficulty: 'mixed',
          estimatedTime,
          priority: userState.strugglingTopics?.includes(topic) ? 'high' : 'medium',
          questionIds: allQuestions.map(q => q._id),
          resources: getTopicResources(topic)
        }],
        totalEstimatedTime: estimatedTime,
        isCompleted: false
      });
      currentDate.setDate(currentDate.getDate() + 1);
    } else {
      // Split across multiple days
      const daysNeeded = Math.ceil(estimatedTime / timeConstraints.dailyMinutes);
      const questionsPerDay = Math.ceil(allQuestions.length / daysNeeded);
      
      for (let i = 0; i < daysNeeded; i++) {
        const dayQuestions = allQuestions.slice(i * questionsPerDay, (i + 1) * questionsPerDay);
        const dayTime = dayQuestions.reduce((sum, q) => {
          const baseTime = { 'Easy': 15, 'Medium': 25, 'Hard': 40 }[q.difficulty] || 20;
          return sum + baseTime;
        }, 0);
        
        dailyPlans.push({
          day: dayNumber++,
          date: new Date(currentDate),
          topics: [{
            name: topic,
            difficulty: 'mixed',
            estimatedTime: dayTime,
            priority: userState.strugglingTopics?.includes(topic) ? 'high' : 'medium',
            questionIds: dayQuestions.map(q => q._id),
            resources: getTopicResources(topic)
          }],
          totalEstimatedTime: dayTime,
          isCompleted: false
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }
  
  return dailyPlans;
}

/**
 * Generate weekly milestone checkpoints
 */
function generateWeeklyMilestones(dailyPlans, goals) {
  const milestones = [];
  const totalDays = dailyPlans.length;
  const weeksNeeded = Math.ceil(totalDays / 7);
  
  for (let week = 1; week <= weeksNeeded; week++) {
    const weekStart = (week - 1) * 7;
    const weekEnd = Math.min(week * 7, totalDays);
    const weekDays = dailyPlans.slice(weekStart, weekEnd);
    
    const topicsCovered = [...new Set(weekDays.flatMap(day => day.topics.map(t => t.name)))];
    const expectedProgress = (weekEnd / totalDays) * 100;
    
    milestones.push({
      week,
      startDate: weekDays[0].date,
      endDate: weekDays[weekDays.length - 1].date,
      goals: [`Complete ${topicsCovered.length} topics`, `Maintain 70%+ accuracy`],
      topicsCovered,
      expectedProgress,
      actualProgress: 0,
      isCompleted: false
    });
  }
  
  return milestones;
}

/**
 * Calculate confidence score for roadmap feasibility
 */
function calculateRoadmapConfidence(userState, timeConstraints, skillGaps) {
  // Factors:
  // 1. Time available vs required (0.3 weight)
  // 2. User's learning velocity (0.3 weight)
  // 3. Skill gap size (0.2 weight)
  // 4. Historical accuracy (0.2 weight)
  
  const questionsNeeded = skillGaps.length * 5; // 5 questions per topic
  const daysAvailable = timeConstraints.totalDays;
  const questionsPerDay = questionsNeeded / daysAvailable;
  
  const timeScore = questionsPerDay <= 10 ? 1.0 : Math.max(0.3, 10 / questionsPerDay);
  const velocityScore = userState.learningVelocity >= questionsPerDay ? 1.0 : Math.min(1.0, userState.learningVelocity / questionsPerDay);
  const gapScore = skillGaps.length <= 10 ? 1.0 : Math.max(0.5, 10 / skillGaps.length);
  const accuracyScore = Math.min(1.0, userState.avgAccuracy / 70);
  
  const confidence = (timeScore * 0.3) + (velocityScore * 0.3) + (gapScore * 0.2) + (accuracyScore * 0.2);
  
  return Math.round(confidence * 100) / 100;
}

/**
 * Get learning resources for a topic
 */
function getTopicResources(topic) {
  const resourceMap = {
    'Arrays': ['https://leetcode.com/explore/learn/card/array-and-string/'],
    'Dynamic Programming': ['https://leetcode.com/explore/learn/card/dynamic-programming/'],
    'Trees': ['https://leetcode.com/explore/learn/card/data-structure-tree/'],
    'Graph': ['https://leetcode.com/explore/learn/card/graph/'],
    'Linked List': ['https://leetcode.com/explore/learn/card/linked-list/']
  };
  
  return resourceMap[topic] || ['https://leetcode.com/problemset/all/'];
}

/**
 * Regenerate roadmap based on performance
 */
async function regenerateRoadmap(roadmapId, reason) {
  const roadmap = await SmartRoadmap.findById(roadmapId);
  if (!roadmap) throw new Error('Roadmap not found');
  
  // Mark old roadmap as paused
  roadmap.status = 'paused';
  roadmap.adaptiveMetrics.adjustmentHistory.push({
    date: new Date(),
    reason,
    changes: 'Regenerated entire roadmap',
    impact: 'New schedule generated'
  });
  await roadmap.save();
  
  // Generate new roadmap
  const newRoadmap = await generateRoadmap(roadmap.userId, roadmap.goals);
  
  return newRoadmap;
}

export {
  generateRoadmap,
  regenerateRoadmap,
  analyzeUserState,
  calculateTimeConstraints,
  identifySkillGaps
};
