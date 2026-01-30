import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import * as analyticsService from '../services/analyticsService.js';
import Analytics from '../models/Analytics.js';

const router = express.Router();

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get comprehensive dashboard analytics
 * @access  Private
 */
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const analytics = await analyticsService.getDashboardAnalytics(req.user.id, days);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard analytics',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/trends
 * @desc    Get performance trends over time
 * @access  Private
 */
router.get('/trends', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const trends = await Analytics.getUserTrend(req.user.id, days);
    
    // Format for chart consumption
    const formatted = trends.map(entry => ({
      date: entry.date,
      accuracy: entry.performance.accuracy,
      speed: entry.performance.speed,
      questionsAttempted: entry.practiceMetrics.questionsAttempted,
      readinessScore: entry.predictions.readinessScore
    }));
    
    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trends',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/heatmap
 * @desc    Get topic mastery heatmap
 * @access  Private
 */
router.get('/heatmap', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const heatmap = await Analytics.getTopicHeatmap(req.user.id, days);
    
    res.json({
      success: true,
      data: heatmap
    });
  } catch (error) {
    console.error('Heatmap error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch heatmap',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/predictions
 * @desc    Get predictive analytics and recommendations
 * @access  Private
 */
router.get('/predictions', authMiddleware, async (req, res) => {
  try {
    // Generate latest snapshot
    await analyticsService.generateDailySnapshot(req.user.id);
    
    const latest = await Analytics.findOne({ user: req.user.id })
      .sort({ date: -1 })
      .lean();
    
    if (!latest) {
      return res.json({
        success: true,
        data: {
          readinessScore: 0,
          estimatedPassProbability: 0,
          suggestedFocusAreas: [],
          daysToReadiness: 999,
          confidenceLevel: 'low'
        }
      });
    }
    
    res.json({
      success: true,
      data: latest.predictions
    });
  } catch (error) {
    console.error('Predictions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch predictions',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/strengths-weaknesses
 * @desc    Get strengths and weaknesses analysis
 * @access  Private
 */
router.get('/strengths-weaknesses', authMiddleware, async (req, res) => {
  try {
    await analyticsService.generateDailySnapshot(req.user.id);
    
    const latest = await Analytics.findOne({ user: req.user.id })
      .sort({ date: -1 })
      .lean();
    
    if (!latest) {
      return res.json({
        success: true,
        data: {
          strengths: [],
          weaknesses: []
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        strengths: latest.strengths,
        weaknesses: latest.weaknesses
      }
    });
  } catch (error) {
    console.error('Strengths/weaknesses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch strengths and weaknesses',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/study-patterns
 * @desc    Get study pattern insights
 * @access  Private
 */
router.get('/study-patterns', authMiddleware, async (req, res) => {
  try {
    await analyticsService.generateDailySnapshot(req.user.id);
    
    const latest = await Analytics.findOne({ user: req.user.id })
      .sort({ date: -1 })
      .lean();
    
    if (!latest) {
      return res.json({
        success: true,
        data: {
          preferredTime: 'unknown',
          averageSessionLength: 0,
          mostProductiveDay: 'unknown',
          studyFrequency: 0
        }
      });
    }
    
    res.json({
      success: true,
      data: latest.studyPatterns
    });
  } catch (error) {
    console.error('Study patterns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch study patterns',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/leaderboard
 * @desc    Get user's leaderboard position
 * @access  Private
 */
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const position = await Analytics.getLeaderboardPosition(req.user.id);
    
    res.json({
      success: true,
      data: position
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard position',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/topic-mastery
 * @desc    Get detailed topic mastery data
 * @access  Private
 */
router.get('/topic-mastery', authMiddleware, async (req, res) => {
  try {
    await analyticsService.generateDailySnapshot(req.user.id);
    
    const latest = await Analytics.findOne({ user: req.user.id })
      .sort({ date: -1 })
      .lean();
    
    if (!latest) {
      return res.json({
        success: true,
        data: {}
      });
    }
    
    // Convert Map to object for JSON serialization
    const topicMastery = {};
    if (latest.topicMastery) {
      latest.topicMastery.forEach((value, key) => {
        topicMastery[key] = value;
      });
    }
    
    res.json({
      success: true,
      data: topicMastery
    });
  } catch (error) {
    console.error('Topic mastery error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch topic mastery',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/analytics/generate-snapshot
 * @desc    Manually trigger snapshot generation
 * @access  Private
 */
router.post('/generate-snapshot', authMiddleware, async (req, res) => {
  try {
    const snapshot = await analyticsService.generateDailySnapshot(req.user.id);
    
    res.json({
      success: true,
      data: snapshot,
      message: 'Analytics snapshot generated successfully'
    });
  } catch (error) {
    console.error('Generate snapshot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate snapshot',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/comparison/:userId
 * @desc    Compare performance with another user (if allowed)
 * @access  Private
 */
router.get('/comparison/:userId', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    
    // Get both users' latest analytics
    const userAnalytics = await Analytics.findOne({ user: req.user.id })
      .sort({ date: -1 })
      .lean();
    
    const targetAnalytics = await Analytics.findOne({ user: targetUserId })
      .sort({ date: -1 })
      .lean();
    
    if (!userAnalytics || !targetAnalytics) {
      return res.status(404).json({
        success: false,
        error: 'Analytics data not available for comparison'
      });
    }
    
    const comparison = {
      accuracy: {
        user: userAnalytics.performance.accuracy,
        target: targetAnalytics.performance.accuracy,
        difference: userAnalytics.performance.accuracy - targetAnalytics.performance.accuracy
      },
      speed: {
        user: userAnalytics.performance.speed,
        target: targetAnalytics.performance.speed,
        difference: userAnalytics.performance.speed - targetAnalytics.performance.speed
      },
      readinessScore: {
        user: userAnalytics.predictions.readinessScore,
        target: targetAnalytics.predictions.readinessScore,
        difference: userAnalytics.predictions.readinessScore - targetAnalytics.predictions.readinessScore
      }
    };
    
    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comparison',
      message: error.message
    });
  }
});

export default router;
