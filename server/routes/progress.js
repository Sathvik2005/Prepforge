import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import Progress from '../models/Progress.js';
import User from '../models/User.js';

const router = express.Router();

// Submit answer
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { questionId, isCorrect, timeSpent } = req.body;

    // Find or create progress entry
    let progress = await Progress.findOne({ userId: req.userId, questionId });

    if (progress) {
      progress.attempts += 1;
      progress.timeSpent += timeSpent;
      progress.isCorrect = isCorrect;
      progress.status = isCorrect ? 'solved' : 'attempted';
      progress.lastAttemptAt = Date.now();
    } else {
      progress = new Progress({
        userId: req.userId,
        questionId,
        status: isCorrect ? 'solved' : 'attempted',
        isCorrect,
        timeSpent,
      });
    }

    await progress.save();

    // Update user stats
    const user = await User.findById(req.userId);
    if (isCorrect) {
      user.stats.questionsSolved += 1;
    }

    // Calculate accuracy
    const allProgress = await Progress.find({ userId: req.userId });
    const correctCount = allProgress.filter((p) => p.isCorrect).length;
    user.stats.accuracy = Math.round((correctCount / allProgress.length) * 100);

    await user.save();

    res.json({ message: 'Progress saved', progress, stats: user.stats });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit answer', error: error.message });
  }
});

// Get user progress
router.get('/', authMiddleware, async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.userId }).populate('questionId');
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch progress', error: error.message });
  }
});

// Get analytics data
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.userId });

    // Calculate analytics
    const topicStats = {};
    progress.forEach((p) => {
      const topic = p.questionId?.topic || 'Other';
      if (!topicStats[topic]) {
        topicStats[topic] = { total: 0, correct: 0 };
      }
      topicStats[topic].total += 1;
      if (p.isCorrect) topicStats[topic].correct += 1;
    });

    const analytics = Object.entries(topicStats).map(([topic, data]) => ({
      topic,
      accuracy: Math.round((data.correct / data.total) * 100),
      solved: data.correct,
      total: data.total,
    }));

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
  }
});

export default router;
