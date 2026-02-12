import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import Roadmap from '../models/Roadmap.js';
import {
  generateAIRoadmap,
  refineRoadmap,
  generateNextSteps,
} from '../services/aiRoadmapService.js';

const router = express.Router();

/**
 * POST /api/roadmap/generate
 * Generate a new AI-powered roadmap
 */
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { goal, currentLevel, targetRole, timeframe, skills, preferredTopics, jobDescription } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!goal || !currentLevel || !timeframe) {
      return res.status(400).json({
        error: 'Missing required fields: goal, currentLevel, timeframe',
      });
    }

    // Generate roadmap using AI with multi-provider support
    const result = await generateAIRoadmap({
      goal,
      currentLevel,
      targetRole,
      timeframe,
      skills: skills || [],
      preferredTopics: preferredTopics || [],
      jobDescription: jobDescription || '',
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Save to database with enhanced fields
    const roadmap = new Roadmap({
      userId,
      title: result.roadmap.title,
      goal,
      currentLevel,
      targetRole,
      timeframe,
      skills: skills || [],
      jobDescription: jobDescription || null,
      milestones: result.roadmap.milestones,
      skillGapAnalysis: result.roadmap.skillGapAnalysis,
      weeklyCommitment: result.roadmap.weeklyCommitment,
      interviewPrep: result.roadmap.interviewPrep,
      careerAdvice: result.roadmap.careerAdvice,
      progress: {
        completedMilestones: 0,
        totalMilestones: result.roadmap.milestones.length,
        percentage: 0,
      },
      isAIGenerated: true,
      metadata: result.metadata,
    });

    await roadmap.save();

    res.status(201).json({
      success: true,
      roadmap,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('Error generating roadmap:', error);
    res.status(500).json({ error: 'Failed to generate roadmap' });
  }
});

/**
 * GET /api/roadmap/user/:userId
 * Get all roadmaps for a user
 */
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const roadmaps = await Roadmap.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      roadmaps,
    });
  } catch (error) {
    console.error('Error fetching roadmaps:', error);
    res.status(500).json({ error: 'Failed to fetch roadmaps' });
  }
});

/**
 * GET /api/roadmap/:id
 * Get specific roadmap by ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const roadmap = await Roadmap.findById(id);

    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    res.json({
      success: true,
      roadmap,
    });
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({ error: 'Failed to fetch roadmap' });
  }
});

/**
 * PUT /api/roadmap/:id/milestone/:milestoneId/complete
 * Mark a milestone as completed
 */
router.put('/:id/milestone/:milestoneId/complete', authMiddleware, async (req, res) => {
  try {
    const { id, milestoneId } = req.params;

    const roadmap = await Roadmap.findById(id);

    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    const milestone = roadmap.milestones.find((m) => m.id === milestoneId);

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    milestone.completed = true;
    milestone.completedAt = new Date();

    roadmap.updateProgress();
    await roadmap.save();

    res.json({
      success: true,
      roadmap,
    });
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({ error: 'Failed to update milestone' });
  }
});

/**
 * PUT /api/roadmap/:id/milestone/:milestoneId/uncomplete
 * Mark a milestone as not completed
 */
router.put('/:id/milestone/:milestoneId/uncomplete', authMiddleware, async (req, res) => {
  try {
    const { id, milestoneId } = req.params;

    const roadmap = await Roadmap.findById(id);

    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    const milestone = roadmap.milestones.find((m) => m.id === milestoneId);

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    milestone.completed = false;
    milestone.completedAt = null;

    roadmap.updateProgress();
    await roadmap.save();

    res.json({
      success: true,
      roadmap,
    });
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({ error: 'Failed to update milestone' });
  }
});

/**
 * POST /api/roadmap/:id/refine
 * Refine existing roadmap based on feedback
 */
router.post('/:id/refine', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback, preferences } = req.body;

    const roadmap = await Roadmap.findById(id);

    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    const result = await refineRoadmap(
      {
        title: roadmap.title,
        milestones: roadmap.milestones,
      },
      feedback,
      preferences
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Update roadmap with refined version
    roadmap.milestones = result.roadmap.milestones;
    roadmap.progress.totalMilestones = result.roadmap.milestones.length;
    roadmap.updateProgress();

    await roadmap.save();

    res.json({
      success: true,
      roadmap,
    });
  } catch (error) {
    console.error('Error refining roadmap:', error);
    res.status(500).json({ error: 'Failed to refine roadmap' });
  }
});

/**
 * GET /api/roadmap/:id/next-steps
 * Get next recommended steps
 */
router.get('/:id/next-steps', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const roadmap = await Roadmap.findById(id);

    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    const completedMilestones = roadmap.milestones
      .filter((m) => m.completed)
      .map((m) => m.id);

    const nextSteps = await generateNextSteps(
      {
        milestones: roadmap.milestones,
      },
      completedMilestones
    );

    res.json({
      success: true,
      ...nextSteps,
    });
  } catch (error) {
    console.error('Error generating next steps:', error);
    res.status(500).json({ error: 'Failed to generate next steps' });
  }
});

/**
 * PUT /api/roadmap/:id/status
 * Update roadmap status
 */
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'completed', 'paused', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const roadmap = await Roadmap.findById(id);

    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    roadmap.status = status;
    await roadmap.save();

    res.json({
      success: true,
      roadmap,
    });
  } catch (error) {
    console.error('Error updating roadmap status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * DELETE /api/roadmap/:id
 * Delete a roadmap
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const roadmap = await Roadmap.findByIdAndDelete(id);

    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    res.json({
      success: true,
      message: 'Roadmap deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting roadmap:', error);
    res.status(500).json({ error: 'Failed to delete roadmap' });
  }
});

export default router;
