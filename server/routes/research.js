import express from 'express';
import LearningBehavior from '../models/LearningBehavior.js';
import QuestionCalibration from '../models/QuestionCalibration.js';
import Progress from '../models/Progress.js';
import Question from '../models/Question.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/research/learning-behavior
// @desc    Get learning behavior analytics
// @access  Private
router.get('/learning-behavior', auth, async (req, res) => {
  try {
    let behavior = await LearningBehavior.findOne({ userId: req.user.id });

    if (!behavior) {
      // Initialize if doesn't exist
      behavior = new LearningBehavior({ userId: req.user.id });
      await behavior.save();
    }

    res.json(behavior);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/research/track-session
// @desc    Track learning session for behavior analysis
// @access  Private
router.post('/track-session', auth, async (req, res) => {
  try {
    const { sessionId, startTime, endTime, questionsAttempted, accuracy, topics } = req.body;

    let behavior = await LearningBehavior.findOne({ userId: req.user.id });

    if (!behavior) {
      behavior = new LearningBehavior({ userId: req.user.id });
    }

    // Add session
    behavior.studySessions.push({
      sessionId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      questionsAttempted,
      accuracy,
      topics,
      cognitiveLoadAtEnd: behavior.cognitiveLoad.currentLoad,
    });

    // Update learning velocity
    behavior.learningVelocity.questionsPerDay = 
      (behavior.learningVelocity.questionsPerDay + questionsAttempted) / 2;

    await behavior.save();

    res.json(behavior);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/research/cognitive-load
// @desc    Update cognitive load based on signals
// @access  Private
router.put('/cognitive-load', auth, async (req, res) => {
  try {
    const { signals } = req.body; // { timeSpike, rapidSwitching, accuracyDrop }

    let behavior = await LearningBehavior.findOne({ userId: req.user.id });

    if (!behavior) {
      behavior = new LearningBehavior({ userId: req.user.id });
    }

    // Determine load level
    let loadLevel = 'optimal';
    if (signals.timeSpike && signals.accuracyDrop) {
      loadLevel = 'overload';
    } else if (signals.timeSpike || signals.rapidSwitching) {
      loadLevel = 'high';
    }

    behavior.cognitiveLoad.currentLoad = loadLevel;
    behavior.cognitiveLoad.loadHistory.push({
      timestamp: new Date(),
      loadLevel,
      signals,
    });

    // Recommend break if overload
    if (loadLevel === 'overload') {
      behavior.cognitiveLoad.breakRecommendations.push({
        timestamp: new Date(),
        reason: 'High cognitive load detected',
        taken: false,
      });
    }

    await behavior.save();

    res.json({
      currentLoad: behavior.cognitiveLoad.currentLoad,
      recommendation: loadLevel === 'overload' ? 'Take a break' : 'Continue',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/research/skill-mastery
// @desc    Get skill mastery estimation for all topics
// @access  Private
router.get('/skill-mastery', auth, async (req, res) => {
  try {
    let behavior = await LearningBehavior.findOne({ userId: req.user.id });

    if (!behavior) {
      return res.json({});
    }

    // Calculate mastery for each topic
    const progress = await Progress.find({ userId: req.user.id }).populate('questionId');

    const topicStats = {};

    progress.forEach(p => {
      if (!p.questionId) return;
      
      const topic = p.questionId.topic;
      
      if (!topicStats[topic]) {
        topicStats[topic] = {
          total: 0,
          correct: 0,
          times: [],
        };
      }

      topicStats[topic].total++;
      if (p.isCorrect) topicStats[topic].correct++;
      topicStats[topic].times.push(p.timeSpent);
    });

    // Calculate mastery probability (Bayesian-inspired)
    Object.keys(topicStats).forEach(topic => {
      const stats = topicStats[topic];
      const accuracy = stats.correct / stats.total;
      const avgTime = stats.times.reduce((a, b) => a + b, 0) / stats.times.length;
      
      // Simple model: mastery = (accuracy * 0.7) + (speed_factor * 0.3)
      // Speed factor: faster = better (normalized)
      const speedFactor = Math.max(0, 1 - (avgTime / 300)); // 300s baseline
      
      const masteryProbability = (accuracy * 0.7) + (speedFactor * 0.3);
      const confidence = Math.min(stats.total / 20, 1); // More attempts = higher confidence

      // Calculate consistency (variance in performance)
      const consistency = 1 - Math.min(
        stats.times.reduce((sum, t, i, arr) => {
          return sum + Math.abs(t - avgTime);
        }, 0) / (stats.times.length * avgTime),
        1
      );

      behavior.skillMastery.set(topic, {
        masteryProbability,
        confidence,
        lastUpdated: new Date(),
        questionsAttempted: stats.total,
        accuracy,
        avgSpeed: avgTime,
        consistency,
      });
    });

    await behavior.save();

    res.json(Object.fromEntries(behavior.skillMastery));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/research/calibrate-question
// @desc    Update question difficulty calibration
// @access  Private (Admin in production)
router.post('/calibrate-question/:questionId', auth, async (req, res) => {
  try {
    const { questionId } = req.params;

    // Get all attempts for this question
    const attempts = await Progress.find({ questionId }).populate('userId');

    let calibration = await QuestionCalibration.findOne({ questionId });

    if (!calibration) {
      const question = await Question.findById(questionId);
      calibration = new QuestionCalibration({
        questionId,
        calibration: {
          originalDifficulty: question.difficulty,
          calibratedDifficulty: question.difficulty,
          lastCalibrated: new Date(),
        },
      });
    }

    // Calculate statistics
    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(a => a.isCorrect).length;
    const successRate = (correctAttempts / totalAttempts) * 100;
    const avgTime = attempts.reduce((sum, a) => sum + a.timeSpent, 0) / totalAttempts;

    calibration.statistics = {
      totalAttempts,
      correctAttempts,
      successRate,
      averageTime: avgTime,
      completionRate: 100, // Assume all attempts complete for now
    };

    // Recalibrate difficulty based on success rate
    let newDifficulty = calibration.calibration.originalDifficulty;
    
    if (successRate > 85 && avgTime < 120) {
      // Too easy
      if (newDifficulty === 'easy') newDifficulty = 'medium';
      else if (newDifficulty === 'medium') newDifficulty = 'hard';
    } else if (successRate < 40) {
      // Too hard
      if (newDifficulty === 'hard') newDifficulty = 'medium';
      else if (newDifficulty === 'medium') newDifficulty = 'easy';
    }

    calibration.calibration.calibratedDifficulty = newDifficulty;
    calibration.calibration.confidence = Math.min(totalAttempts / 50, 1); // Higher attempts = higher confidence
    calibration.calibration.lastCalibrated = new Date();

    await calibration.save();

    res.json(calibration);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/research/longitudinal-progress
// @desc    Get longitudinal progress tracking
// @access  Private
router.get('/longitudinal-progress', auth, async (req, res) => {
  try {
    let behavior = await LearningBehavior.findOne({ userId: req.user.id });

    if (!behavior) {
      return res.json({ weeklyProgress: [], projectedReadinessDate: null });
    }

    // Calculate weekly progress
    const progress = await Progress.find({ userId: req.user.id })
      .sort({ createdAt: 1 })
      .populate('questionId');

    const weeklyData = {};

    progress.forEach(p => {
      const week = new Date(p.createdAt);
      week.setHours(0, 0, 0, 0);
      week.setDate(week.getDate() - week.getDay()); // Start of week

      const weekKey = week.toISOString();

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week,
          questionsCompleted: 0,
          correct: 0,
          topics: new Set(),
        };
      }

      weeklyData[weekKey].questionsCompleted++;
      if (p.isCorrect) weeklyData[weekKey].correct++;
      if (p.questionId) weeklyData[weekKey].topics.add(p.questionId.topic);
    });

    const weeklyProgress = Object.values(weeklyData).map(week => ({
      week: week.week,
      questionsCompleted: week.questionsCompleted,
      averageAccuracy: (week.correct / week.questionsCompleted) * 100,
      topicsImproved: Array.from(week.topics),
      masteryGain: 0, // Calculate based on mastery changes
    }));

    // Project readiness date (simple linear model)
    if (weeklyProgress.length >= 2) {
      const recentWeeks = weeklyProgress.slice(-4);
      const avgQuestionsPerWeek = recentWeeks.reduce((sum, w) => sum + w.questionsCompleted, 0) / recentWeeks.length;
      const avgAccuracy = recentWeeks.reduce((sum, w) => sum + w.averageAccuracy, 0) / recentWeeks.length;

      // Estimate weeks needed (assuming 500 questions total, 80%+ accuracy target)
      const totalProgress = await Progress.countDocuments({ userId: req.user.id });
      const remainingQuestions = Math.max(500 - totalProgress, 0);
      const weeksNeeded = Math.ceil(remainingQuestions / avgQuestionsPerWeek);

      const projectedDate = new Date();
      projectedDate.setDate(projectedDate.getDate() + (weeksNeeded * 7));

      behavior.longitudinalProgress = {
        weeklyProgress,
        projectedReadinessDate: projectedDate,
        confidenceInterval: {
          lower: new Date(projectedDate.getTime() - (7 * 24 * 60 * 60 * 1000)), // -1 week
          upper: new Date(projectedDate.getTime() + (14 * 24 * 60 * 60 * 1000)), // +2 weeks
        },
      };

      await behavior.save();
    }

    res.json(behavior.longitudinalProgress);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/research/export
// @desc    Export anonymized research data
// @access  Private
router.get('/export', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Gather all data (anonymized)
    const behavior = await LearningBehavior.findOne({ userId });
    const progress = await Progress.find({ userId }).populate('questionId');
    const calibrations = await QuestionCalibration.find();

    const exportData = {
      metadata: {
        exportDate: new Date(),
        version: '1.0',
        anonymized: true,
      },
      learningBehavior: behavior,
      progressData: progress.map(p => ({
        questionDifficulty: p.questionId?.difficulty,
        questionTopic: p.questionId?.topic,
        isCorrect: p.isCorrect,
        timeSpent: p.timeSpent,
        attempts: p.attempts,
        timestamp: p.createdAt,
      })),
      calibrationData: calibrations.map(c => ({
        originalDifficulty: c.calibration.originalDifficulty,
        calibratedDifficulty: c.calibration.calibratedDifficulty,
        successRate: c.statistics.successRate,
        averageTime: c.statistics.averageTime,
        totalAttempts: c.statistics.totalAttempts,
      })),
    };

    res.json(exportData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
