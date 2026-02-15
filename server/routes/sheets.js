import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import Sheet from '../models/Sheet.js';
import DSAProgress from '../models/DSAProgress.js';

const router = express.Router();

/**
 * GET /api/sheets
 * Get all available DSA sheets
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { type } = req.query;
    const filter = {};
    
    if (type) {
      filter.type = type;
    }
    
    const sheets = await Sheet.find(filter)
      .select('-sections') // Exclude detailed sections for list view
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: sheets
    });
  } catch (error) {
    console.error('Error fetching sheets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sheets',
      error: error.message
    });
  }
});

/**
 * GET /api/sheets/:slug  
 * Get detailed sheet data by slug including all sections and problems
 */
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    
    const sheet = await Sheet.findOne({ slug });
    
    if (!sheet) {
      return res.status(404).json({
        success: false,
        message: 'Sheet not found'
      });
    }
    
    // If user is authenticated, include their progress
    let userProgress = null;
    if (req.user && req.user.uid) {
      const progress = await DSAProgress.findOne({ userId: req.user.uid });
      if (progress) {
        const sheetProgress = progress.sheets.find(s => s.sheetId === slug);
        if (sheetProgress) {
          userProgress = {
            completedProblems: sheetProgress.completedProblems,
            totalProblems: sheetProgress.totalProblems,
            completedProblemSlugs: sheetProgress.items
              .filter(item => item.status === 'completed')
              .map(item => item.itemId),
            revisionProblemSlugs: sheetProgress.items
              .filter(item => item.status === 'revisit')
              .map(item => item.itemId),
            notes: sheetProgress.items
              .filter(item => item.notes)
              .reduce((acc, item) => {
                acc[item.itemId] = item.notes;
                return acc;
              }, {})
          };
        }
      }
    }
    
    const responseData = sheet.toObject();
    if (userProgress) {
      responseData.userProgress = userProgress;
    }
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error fetching sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sheet',
      error: error.message
    });
  }
});

/**
 * POST /api/sheets/:slug/progress/toggle
 * Toggle problem completion status
 */
router.post('/:slug/progress/toggle', authMiddleware, async (req, res) => {
  try {
    const { slug } = req.params;
    const { problemSlug } = req.body;
    const userId = req.user.uid;
    
    if (!problemSlug) {
      return res.status(400).json({
        success: false,
        message: 'Problem slug is required'
      });
    }
    
    // Get the sheet to know total problems
    const sheet = await Sheet.findOne({ slug });
    if (!sheet) {
      return res.status(404).json({
        success: false,
        message: 'Sheet not found'
      });
    }
    
    // Find or create progress document
    let progress = await DSAProgress.findOne({ userId });
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
    }
    
    // Update streak
    progress.updateStreak();
    
    // Find or create sheet progress
    let sheetProgress = progress.sheets.find(s => s.sheetId === slug);
    if (!sheetProgress) {
      sheetProgress = {
        sheetId: slug,
        sheetType: sheet.type,
        totalProblems: sheet.totalProblems,
        completedProblems: 0,
        items: [],
        startedAt: new Date(),
        lastUpdatedAt: new Date()
      };
      progress.sheets.push(sheetProgress);
    }
    
    // Find or create item progress
    let item = sheetProgress.items.find(i => i.itemId === problemSlug);
    if (!item) {
      item = {
        itemId: problemSlug,
        itemType: 'problem',
        status: 'completed',
        completedAt: new Date(),
        attempts: 1,
        timeSpent: 0,
        lastAccessedAt: new Date()
      };
      sheetProgress.items.push(item);
      sheetProgress.completedProblems++;
      progress.overallStats.totalProblemsSolved++;
    } else {
      // Toggle completion
      if (item.status === 'completed') {
        item.status = 'not-started';
        item.completedAt = null;
        sheetProgress.completedProblems--;
        progress.overallStats.totalProblemsSolved--;
      } else {
        item.status = 'completed';
        item.completedAt = new Date();
        sheetProgress.completedProblems++;
        progress.overallStats.totalProblemsSolved++;
      }
      item.lastAccessedAt = new Date();
    }
    
    sheetProgress.lastUpdatedAt = new Date();
    await progress.save();
    
    res.json({
      success: true,
      data: {
        completed: item.status === 'completed',
        totalCompleted: sheetProgress.completedProblems,
        totalProblems: sheetProgress.totalProblems,
        percentage: Math.round((sheetProgress.completedProblems / sheetProgress.totalProblems) * 100)
      }
    });
  } catch (error) {
    console.error('Error toggling progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle progress',
      error: error.message
    });
  }
});

/**
 * POST /api/sheets/:slug/revision/toggle
 * Toggle problem revision status
 */
router.post('/:slug/revision/toggle', authMiddleware, async (req, res) => {
  try {
    const { slug } = req.params;
    const { problemSlug } = req.body;
    const userId = req.user.uid;
    
    if (!problemSlug) {
      return res.status(400).json({
        success: false,
        message: 'Problem slug is required'
      });
    }
    
    // Get the sheet
    const sheet = await Sheet.findOne({ slug });
    if (!sheet) {
      return res.status(404).json({
        success: false,
        message: 'Sheet not found'
      });
    }
    
    // Find or create progress
    let progress = await DSAProgress.findOne({ userId });
    if (!progress) {
      progress = new DSAProgress({ userId });
    }
    
    let sheetProgress = progress.sheets.find(s => s.sheetId === slug);
    if (!sheetProgress) {
      sheetProgress = {
        sheetId: slug,
        sheetType: sheet.type,
        totalProblems: sheet.totalProblems,
        completedProblems: 0,
        items: [],
        startedAt: new Date(),
        lastUpdatedAt: new Date()
      };
      progress.sheets.push(sheetProgress);
    }
    
    let item = sheetProgress.items.find(i => i.itemId === problemSlug);
    if (!item) {
      item = {
        itemId: problemSlug,
        itemType: 'problem',
        status: 'revisit',
        lastAccessedAt: new Date()
      };
      sheetProgress.items.push(item);
    } else {
      // Toggle revision
      item.status = item.status === 'revisit' ? 'not-started' : 'revisit';
      item.lastAccessedAt = new Date();
    }
    
    sheetProgress.lastUpdatedAt = new Date();
    await progress.save();
    
    res.json({
      success: true,
      data: {
        inRevision: item.status === 'revisit'
      }
    });
  } catch (error) {
    console.error('Error toggling revision:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle revision',
      error: error.message
    });
  }
});

/**
 * POST /api/sheets/:slug/notes/save
 * Save notes for a problem
 */
router.post('/:slug/notes/save', authMiddleware, async (req, res) => {
  try {
    const { slug } = req.params;
    const { problemSlug, notes } = req.body;
    const userId = req.user.uid;
    
    if (!problemSlug) {
      return res.status(400).json({
        success: false,
        message: 'Problem slug is required'
      });
    }
    
    // Get the sheet
    const sheet = await Sheet.findOne({ slug });
    if (!sheet) {
      return res.status(404).json({
        success: false,
        message: 'Sheet not found'
      });
    }
    
    // Find or create progress
    let progress = await DSAProgress.findOne({ userId });
    if (!progress) {
      progress = new DSAProgress({ userId });
    }
    
    let sheetProgress = progress.sheets.find(s => s.sheetId === slug);
    if (!sheetProgress) {
      sheetProgress = {
        sheetId: slug,
        sheetType: sheet.type,
        totalProblems: sheet.totalProblems,
        completedProblems: 0,
        items: [],
        startedAt: new Date(),
        lastUpdatedAt: new Date()
      };
      progress.sheets.push(sheetProgress);
    }
    
    let item = sheetProgress.items.find(i => i.itemId === problemSlug);
    if (!item) {
      item = {
        itemId: problemSlug,
        itemType: 'problem',
        status: 'in-progress',
        notes: notes || '',
        lastAccessedAt: new Date()
      };
      sheetProgress.items.push(item);
    } else {
      item.notes = notes || '';
      item.lastAccessedAt = new Date();
    }
    
    sheetProgress.lastUpdatedAt = new Date();
    await progress.save();
    
    res.json({
      success: true,
      data: {
        notes: item.notes
      }
    });
  } catch (error) {
    console.error('Error saving notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save notes',
      error: error.message
    });
  }
});

/**
 * GET /api/sheets/:slug/random
 * Get a random unsolved problem from the sheet
 */
router.get('/:slug/random', authMiddleware, async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user.uid;
    
    const sheet = await Sheet.findOne({ slug });
    if (!sheet) {
      return res.status(404).json({
        success: false,
        message: 'Sheet not found'
      });
    }
    
    // Get all problems from all sections
    const allProblems = sheet.sections.reduce((acc, section) => {
      return [...acc, ...section.problems.map(p => ({ ...p, sectionSlug: section.slug }))];
    }, []);
    
    // Get user progress
    const progress = await DSAProgress.findOne({ userId });
    let completedSlugs = [];
    if (progress) {
      const sheetProgress = progress.sheets.find(s => s.sheetId === slug);
      if (sheetProgress) {
        completedSlugs = sheetProgress.items
          .filter(item => item.status === 'completed')
          .map(item => item.itemId);
      }
    }
    
    // Filter unsolved problems
    const unsolvedProblems = allProblems.filter(p => !completedSlugs.includes(p.slug));
    
    // If all solved, pick any random problem
    const problemsPool = unsolvedProblems.length > 0 ? unsolvedProblems : allProblems;
    
    const randomIndex = Math.floor(Math.random() * problemsPool.length);
    const randomProblem = problemsPool[randomIndex];
    
    res.json({
      success: true,
      data: randomProblem
    });
  } catch (error) {
    console.error('Error getting random problem:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get random problem',
      error: error.message
    });
  }
});

export default router;
