import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getUserGamificationProfile,
  getLeaderboard,
  awardXP,
  updateStreak,
  checkAchievements,
  updateUserAccuracy,
  ACHIEVEMENTS,
  XP_LEVELS,
} from '../services/gamificationService.js';
import User from '../models/User.js';

const router = express.Router();

// Get user's gamification profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await getUserGamificationProfile(userId);
    
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ profile });
  } catch (error) {
    console.error('Get gamification profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { timeframe = 'all', limit = 50 } = req.query;
    const leaderboard = await getLeaderboard(timeframe, parseInt(limit));
    
    res.json({ leaderboard, timeframe });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get all achievements
router.get('/achievements', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('badges');
    
    const earnedBadgeIds = user.badges?.map(b => b.name) || [];
    
    const achievements = Object.values(ACHIEVEMENTS).map(achievement => ({
      ...achievement,
      earned: earnedBadgeIds.includes(achievement.id),
      earnedAt: user.badges?.find(b => b.name === achievement.id)?.earnedAt,
    }));
    
    res.json({ achievements });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ error: 'Failed to get achievements' });
  }
});

// Award XP manually (for admin or specific events)
router.post('/award-xp', authMiddleware, async (req, res) => {
  try {
    const { xp, reason } = req.body;
    const userId = req.user.id;
    
    if (!xp || xp <= 0) {
      return res.status(400).json({ error: 'Invalid XP amount' });
    }
    
    const result = await awardXP(userId, xp, reason || 'Manual award');
    
    res.json({ 
      message: 'XP awarded successfully',
      ...result,
    });
  } catch (error) {
    console.error('Award XP error:', error);
    res.status(500).json({ error: 'Failed to award XP' });
  }
});

// Update daily streak
router.post('/streak', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const streak = await updateStreak(userId);
    
    res.json({ 
      message: 'Streak updated',
      streak,
    });
  } catch (error) {
    console.error('Update streak error:', error);
    res.status(500).json({ error: 'Failed to update streak' });
  }
});

// Check for new achievements
router.post('/check-achievements', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const newAchievements = await checkAchievements(userId);
    
    res.json({ 
      message: newAchievements.length > 0 ? 'New achievements earned!' : 'No new achievements',
      achievements: newAchievements,
    });
  } catch (error) {
    console.error('Check achievements error:', error);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

// Update user stats (called after solving a problem)
router.post('/update-stats', authMiddleware, async (req, res) => {
  try {
    const { questionsSolved, studyMinutes, isCorrect } = req.body;
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update stats
    if (questionsSolved) {
      user.stats.questionsSolved += 1;
    }
    
    if (studyMinutes) {
      user.stats.studyHours += studyMinutes / 60;
    }
    
    await user.save();
    
    // Update accuracy
    await updateUserAccuracy(userId);
    
    // Award XP based on action
    let xpReward = 0;
    let reason = '';
    
    if (questionsSolved && isCorrect) {
      xpReward = 10; // Base XP for solving a problem
      reason = 'Solved a problem correctly';
    }
    
    if (xpReward > 0) {
      await awardXP(userId, xpReward, reason);
    }
    
    // Check for new achievements
    const newAchievements = await checkAchievements(userId);
    
    // Update streak
    const streak = await updateStreak(userId);
    
    res.json({ 
      message: 'Stats updated',
      stats: user.stats,
      streak,
      xpEarned: xpReward,
      newAchievements,
    });
  } catch (error) {
    console.error('Update stats error:', error);
    res.status(500).json({ error: 'Failed to update stats' });
  }
});

// Get XP levels info
router.get('/levels', (req, res) => {
  res.json({ levels: XP_LEVELS });
});

// Get user rank
router.get('/rank', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('stats');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Count users with higher XP
    const rank = await User.countDocuments({
      'stats.xp': { $gt: user.stats.xp || 0 },
    }) + 1;
    
    // Get total users
    const totalUsers = await User.countDocuments();
    
    res.json({ 
      rank,
      totalUsers,
      percentile: Math.round(((totalUsers - rank) / totalUsers) * 100),
    });
  } catch (error) {
    console.error('Get rank error:', error);
    res.status(500).json({ error: 'Failed to get rank' });
  }
});

export default router;
