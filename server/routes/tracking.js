import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  trackActivity,
  getUserMetrics,
  getUserActivityHistory,
  getRealtimeAnalytics
} from '../services/userTrackingService.js';

const router = express.Router();

/**
 * Track user activity
 * POST /api/tracking/activity
 */
router.post('/activity', authMiddleware, async (req, res) => {
  try {
    const { activityType, metadata, duration } = req.body;
    const userId = req.user.id; // MongoDB ObjectId as string
    
    const activity = await trackActivity(userId, activityType, {
      ...metadata,
      sessionId: req.headers['x-session-id'] || `session-${Date.now()}`,
      deviceInfo: {
        userAgent: req.headers['user-agent'],
        platform: req.headers['sec-ch-ua-platform'],
        browser: req.headers['sec-ch-ua']
      }
    }, duration || 0);
    
    // Emit real-time update via Socket.IO
    req.app.get('io').to(`user-${userId}`).emit('activity:tracked', {
      activityType,
      timestamp: activity.timestamp
    });
    
    res.json({ success: true, activity });
  } catch (error) {
    console.error('Error tracking activity:', error);
    res.status(500).json({ error: 'Failed to track activity' });
  }
});

/**
 * Get user metrics
 * GET /api/tracking/metrics
 */
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // MongoDB ObjectId as string
    const metrics = await getUserMetrics(userId);
    
    res.json(metrics);
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

/**
 * Get user activity history
 * GET /api/tracking/history
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // MongoDB ObjectId as string
    const { activityType, startDate, endDate, limit, skip } = req.query;
    
    const activities = await getUserActivityHistory(userId, {
      activityType,
      startDate,
      endDate,
      limit: parseInt(limit) || 100,
      skip: parseInt(skip) || 0
    });
    
    res.json(activities);
  } catch (error) {
    console.error('Error getting activity history:', error);
    res.status(500).json({ error: 'Failed to get activity history' });
  }
});

/**
 * Get real-time analytics
 * GET /api/tracking/analytics
 */
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // MongoDB ObjectId as string
    const analytics = await getRealtimeAnalytics(userId);
    
    res.json(analytics);
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * Batch track activities (for offline sync)
 * POST /api/tracking/batch
 */
router.post('/batch', authMiddleware, async (req, res) => {
  try {
    const { activities } = req.body;
    const userId = req.user.id; // MongoDB ObjectId as string
    
    if (!Array.isArray(activities)) {
      return res.status(400).json({ error: 'Activities must be an array' });
    }
    
    const results = await Promise.allSettled(
      activities.map(activity => 
        trackActivity(userId, activity.activityType, activity.metadata, activity.duration)
      )
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({ 
      success: true, 
      tracked: successful, 
      failed,
      total: activities.length 
    });
  } catch (error) {
    console.error('Error batch tracking:', error);
    res.status(500).json({ error: 'Failed to batch track activities' });
  }
});

export default router;
