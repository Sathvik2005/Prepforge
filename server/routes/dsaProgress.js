import express from 'express';
import DSAProgress from '../models/DSAProgress.js';

const router = express.Router();

// Get user's DSA progress
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    let progress = await DSAProgress.findOne({ userId });
    
    // Create new progress document if doesn't exist
    if (!progress) {
      progress = new DSAProgress({
        userId,
        sheets: [],
        playlists: [],
        overallStats: {
          totalProblemsAttempted: 0,
          totalProblemsSolved: 0,
          totalVideosWatched: 0,
          totalTimeSpent: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: new Date()
        },
        achievements: []
      });
      await progress.save();
    }
    
    res.json(progress);
  } catch (error) {
    console.error('Error fetching DSA progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Update sheet progress
router.post('/:userId/sheet/:sheetId', async (req, res) => {
  try {
    const { userId, sheetId } = req.params;
    const { sheetType, totalProblems, itemId, itemType, status, timeSpent, notes } = req.body;
    
    let progress = await DSAProgress.findOne({ userId });
    
    if (!progress) {
      progress = new DSAProgress({ userId });
    }
    
    // Update streak
    progress.updateStreak();
    
    // Find or create sheet progress
    let sheetProgress = progress.sheets.find(s => s.sheetId === sheetId);
    
    if (!sheetProgress) {
      sheetProgress = {
        sheetId,
        sheetType,
        totalProblems,
        completedProblems: 0,
        items: [],
        startedAt: new Date(),
        lastUpdatedAt: new Date()
      };
      progress.sheets.push(sheetProgress);
    }
    
    // Update item progress
    if (itemId) {
      let item = sheetProgress.items.find(i => i.itemId === itemId);
      
      if (!item) {
        item = {
          itemId,
          itemType,
          status: 'not-started',
          attempts: 0,
          timeSpent: 0,
          lastAccessedAt: new Date()
        };
        sheetProgress.items.push(item);
      }
      
      // Update item
      const wasCompleted = item.status === 'completed';
      item.status = status;
      item.attempts++;
      item.timeSpent += timeSpent || 0;
      item.lastAccessedAt = new Date();
      
      if (notes) {
        item.notes = notes;
      }
      
      if (status === 'completed') {
        item.completedAt = new Date();
        
        // Update completed count if newly completed
        if (!wasCompleted) {
          sheetProgress.completedProblems++;
          progress.overallStats.totalProblemsSolved++;
        }
      }
      
      // Update overall stats
      progress.overallStats.totalProblemsAttempted++;
      progress.overallStats.totalTimeSpent += timeSpent || 0;
    }
    
    sheetProgress.lastUpdatedAt = new Date();
    
    await progress.save();
    res.json(progress);
  } catch (error) {
    console.error('Error updating sheet progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Update playlist progress
router.post('/:userId/playlist/:playlistId', async (req, res) => {
  try {
    const { userId, playlistId } = req.params;
    const { playlistType, totalVideos, itemId, itemType, status, timeSpent, notes } = req.body;
    
    let progress = await DSAProgress.findOne({ userId });
    
    if (!progress) {
      progress = new DSAProgress({ userId });
    }
    
    // Update streak
    progress.updateStreak();
    
    // Find or create playlist progress
    let playlistProgress = progress.playlists.find(p => p.playlistId === playlistId);
    
    if (!playlistProgress) {
      playlistProgress = {
        playlistId,
        playlistType,
        totalVideos,
        completedVideos: 0,
        items: [],
        startedAt: new Date(),
        lastUpdatedAt: new Date()
      };
      progress.playlists.push(playlistProgress);
    }
    
    // Update item progress
    if (itemId) {
      let item = playlistProgress.items.find(i => i.itemId === itemId);
      
      if (!item) {
        item = {
          itemId,
          itemType,
          status: 'not-started',
          attempts: 0,
          timeSpent: 0,
          lastAccessedAt: new Date()
        };
        playlistProgress.items.push(item);
      }
      
      // Update item
      const wasCompleted = item.status === 'completed';
      item.status = status;
      item.attempts++;
      item.timeSpent += timeSpent || 0;
      item.lastAccessedAt = new Date();
      
      if (notes) {
        item.notes = notes;
      }
      
      if (status === 'completed') {
        item.completedAt = new Date();
        
        // Update completed count if newly completed
        if (!wasCompleted) {
          playlistProgress.completedVideos++;
          progress.overallStats.totalVideosWatched++;
        }
      }
      
      progress.overallStats.totalTimeSpent += timeSpent || 0;
    }
    
    playlistProgress.lastUpdatedAt = new Date();
    
    await progress.save();
    res.json(progress);
  } catch (error) {
    console.error('Error updating playlist progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Get sheet-specific progress
router.get('/:userId/sheet/:sheetId', async (req, res) => {
  try {
    const { userId, sheetId } = req.params;
    
    const progress = await DSAProgress.findOne({ userId });
    
    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }
    
    const sheetProgress = progress.sheets.find(s => s.sheetId === sheetId);
    
    if (!sheetProgress) {
      return res.status(404).json({ error: 'Sheet progress not found' });
    }
    
    res.json(sheetProgress);
  } catch (error) {
    console.error('Error fetching sheet progress:', error);
    res.status(500).json({ error: 'Failed to fetch sheet progress' });
  }
});

// Get playlist-specific progress
router.get('/:userId/playlist/:playlistId', async (req, res) => {
  try {
    const { userId, playlistId } = req.params;
    
    const progress = await DSAProgress.findOne({ userId });
    
    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }
    
    const playlistProgress = progress.playlists.find(p => p.playlistId === playlistId);
    
    if (!playlistProgress) {
      return res.status(404).json({ error: 'Playlist progress not found' });
    }
    
    res.json(playlistProgress);
  } catch (error) {
    console.error('Error fetching playlist progress:', error);
    res.status(500).json({ error: 'Failed to fetch playlist progress' });
  }
});

// Add achievement
router.post('/:userId/achievement', async (req, res) => {
  try {
    const { userId } = req.params;
    const { achievementId, achievementName, category } = req.body;
    
    const progress = await DSAProgress.findOne({ userId });
    
    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }
    
    // Check if achievement already exists
    const existingAchievement = progress.achievements.find(a => a.achievementId === achievementId);
    
    if (existingAchievement) {
      return res.json({ message: 'Achievement already unlocked', progress });
    }
    
    progress.achievements.push({
      achievementId,
      achievementName,
      unlockedAt: new Date(),
      category
    });
    
    await progress.save();
    res.json({ message: 'Achievement unlocked!', progress });
  } catch (error) {
    console.error('Error adding achievement:', error);
    res.status(500).json({ error: 'Failed to add achievement' });
  }
});

// Get overall statistics
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const progress = await DSAProgress.findOne({ userId });
    
    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }
    
    // Calculate additional stats
    const sheetsStarted = progress.sheets.length;
    const sheetsCompleted = progress.sheets.filter(s => s.completedProblems === s.totalProblems).length;
    const playlistsStarted = progress.playlists.length;
    const playlistsCompleted = progress.playlists.filter(p => p.completedVideos === p.totalVideos).length;
    
    const stats = {
      ...progress.overallStats.toObject(),
      sheetsStarted,
      sheetsCompleted,
      playlistsStarted,
      playlistsCompleted,
      totalAchievements: progress.achievements.length
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
