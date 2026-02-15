import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import Roadmap from '../models/Roadmap.js';
import PDFDocument from 'pdfkit';
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

    console.log('🗺️ Generating roadmap for user:', userId);
    console.log('   Goal:', goal);
    console.log('   Level:', currentLevel);
    console.log('   Timeframe:', timeframe);

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
      console.error('❌ Roadmap generation failed:', result.error);
      return res.status(500).json({ 
        success: false,
        error: result.error || 'Failed to generate roadmap'
      });
    }

    console.log('✅ AI roadmap generated, saving to database...');

    // Save to database with enhanced fields
    const roadmapData = {
      userId,
      title: result.roadmap.title || goal,
      goal,
      currentLevel,
      targetRole: targetRole || '',
      timeframe,
      skills: skills || [],
      preferredTopics: preferredTopics || [],
      jobDescription: jobDescription || null,
      summary: result.roadmap.summary || '',
      milestones: result.roadmap.milestones || [],
      skillGapAnalysis: result.roadmap.skillGapAnalysis || {
        current: skills || [],
        required: [],
        gaps: []
      },
      weeklyCommitment: result.roadmap.weeklyCommitment || '10-15 hours',
      totalDuration: result.roadmap.totalDuration || `${timeframe.value} ${timeframe.unit}`,
      interviewPrep: result.roadmap.interviewPrep || '',
      careerAdvice: result.roadmap.careerAdvice || '',
      progress: {
        completedMilestones: 0,
        totalMilestones: (result.roadmap.milestones || []).length,
        percentage: 0,
      },
      isAIGenerated: true,
      metadata: result.metadata || {},
      status: 'active'
    };

    const roadmap = new Roadmap(roadmapData);
    await roadmap.save();

    console.log('✅ Roadmap saved successfully:', roadmap._id);

    res.status(201).json({
      success: true,
      roadmap,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('❌ Error generating roadmap:', error);
    console.error('   Stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate roadmap',
      details: error.message 
    });
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

/**
 * POST /api/roadmap/:id/export
 * Export roadmap as PDF
 */
router.post('/:id/export', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const roadmap = await Roadmap.findById(id);

    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="roadmap-${id}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    generateRoadmapPDF(doc, roadmap);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error exporting roadmap:', error);
    res.status(500).json({ error: 'Failed to export roadmap' });
  }
});

/**
 * Generate PDF content for roadmap
 */
function generateRoadmapPDF(doc, roadmap) {
  const primaryColor = '#4F46E5'; // Royal blue
  const secondaryColor = '#8B5CF6'; // Purple
  const textColor = '#1F2937'; // Dark gray
  const lightGray = '#F3F4F6';

  // Header
  doc.fontSize(28)
     .fillColor(primaryColor)
     .text(roadmap.title || 'Learning Roadmap', { align: 'center' })
     .moveDown(0.5);

  doc.fontSize(12)
     .fillColor(textColor)
     .text(`Goal: ${roadmap.goal}`, { align: 'center' })
     .text(`Level: ${roadmap.currentLevel} → ${roadmap.targetRole || 'Target Role'}`, { align: 'center' })
     .text(`Duration: ${roadmap.timeframe?.value} ${roadmap.timeframe?.unit}`, { align: 'center' })
     .moveDown(1);

  // Horizontal line
  doc.strokeColor(primaryColor)
     .lineWidth(2)
     .moveTo(50, doc.y)
     .lineTo(545, doc.y)
     .stroke()
     .moveDown(1.5);

  // Summary section (if available)
  if (roadmap.milestones?.[0]?.summary) {
    doc.fontSize(10)
       .fillColor(textColor)
       .text(roadmap.milestones[0].summary, {
         align: 'justify',
         lineGap: 3
       })
       .moveDown(1.5);
  }

  // Progress overview
  const completedCount = roadmap.progress?.completedMilestones || 0;
  const totalCount = roadmap.progress?.totalMilestones || roadmap.milestones?.length || 0;
  const progressPercent = roadmap.progress?.percentage || 0;

  doc.fontSize(14)
     .fillColor(primaryColor)
     .text('Progress Overview', { underline: true })
     .moveDown(0.3);

  doc.fontSize(10)
     .fillColor(textColor)
     .text(`Completed Milestones: ${completedCount}/${totalCount} (${progressPercent}%)`)
     .text(`Weekly Commitment: ${roadmap.weeklyCommitment || '10-15 hours'}`)
     .text(`Status: ${roadmap.status || 'Active'}`)
     .moveDown(1.5);

  // Skill Gap Analysis (if available)
  if (roadmap.skillGapAnalysis) {
    doc.fontSize(14)
       .fillColor(primaryColor)
       .text('Skill Gap Analysis', { underline: true })
       .moveDown(0.3);

    if (roadmap.skillGapAnalysis.current?.length > 0) {
      doc.fontSize(10)
         .fillColor(textColor)
         .text('Current Skills: ' + roadmap.skillGapAnalysis.current.join(', '), {
           lineGap: 3
         })
         .moveDown(0.5);
    }

    if (roadmap.skillGapAnalysis.gaps?.length > 0) {
      doc.text('Skills to Develop: ' + roadmap.skillGapAnalysis.gaps.join(', '), {
        lineGap: 3
      })
      .moveDown(1.5);
    }
  }

  // Milestones
  doc.fontSize(16)
     .fillColor(primaryColor)
     .text('Learning Milestones', { underline: true })
     .moveDown(0.5);

  if (roadmap.milestones && roadmap.milestones.length > 0) {
    roadmap.milestones.forEach((milestone, index) => {
      // Check if we need a new page
      if (doc.y > 650) {
        doc.addPage();
      }

      // Milestone number badge
      doc.save()
         .circle(doc.x, doc.y + 8, 12)
         .fillColor(milestone.completed ? '#10B981' : primaryColor)
         .fill()
         .fillColor('white')
         .fontSize(10)
         .text(index + 1, doc.x - 4, doc.y + 3)
         .restore();

      // Milestone title
      doc.fontSize(12)
         .fillColor(textColor)
         .text(milestone.title, doc.x + 30, doc.y - 7, { continued: false })
         .moveDown(0.3);

      // Milestone details
      doc.fontSize(9)
         .fillColor('#6B7280')
         .text(`Duration: ${milestone.duration}`, doc.x + 30, doc.y, { continued: true })
         .text(` | Week ${milestone.week || index + 1}`, { continued: true })
         .text(` | ${milestone.completed ? '✓ Completed' : 'Pending'}`)
         .moveDown(0.3);

      // Description
      if (milestone.description) {
        doc.fontSize(9)
           .fillColor(textColor)
           .text(milestone.description, doc.x + 30, doc.y, {
             lineGap: 2,
             width: 465
           })
           .moveDown(0.3);
      }

      // Skills
      if (milestone.skills && milestone.skills.length > 0) {
        doc.fontSize(8)
           .fillColor('#8B5CF6')
           .text('Skills: ' + milestone.skills.join(', '), doc.x + 30, doc.y, {
             width: 465
           })
           .moveDown(0.3);
      }

      // Projects
      if (milestone.projects && milestone.projects.length > 0) {
        doc.fontSize(8)
           .fillColor('#10B981')
           .text('Projects:', doc.x + 30, doc.y);
        milestone.projects.forEach(project => {
          doc.fontSize(8)
             .fillColor(textColor)
             .text(`• ${project.name || project.title}`, doc.x + 40, doc.y, {
               width: 455
             });
        });
        doc.moveDown(0.3);
      }

      // Resources (first 3)
      if (milestone.resources && milestone.resources.length > 0) {
        doc.fontSize(8)
           .fillColor('#F59E0B')
           .text('Key Resources:', doc.x + 30, doc.y);
        milestone.resources.slice(0, 3).forEach(resource => {
          doc.fontSize(8)
             .fillColor(textColor)
             .text(`• ${resource.title || resource.name}`, doc.x + 40, doc.y, {
               width: 455
             });
        });
        doc.moveDown(0.3);
      }

      doc.moveDown(0.8);
    });
  }

  // Interview Prep (if available)
  if (roadmap.interviewPrep) {
    if (doc.y > 650) {
      doc.addPage();
    }

    doc.fontSize(14)
       .fillColor(primaryColor)
       .text('Interview Preparation', { underline: true })
       .moveDown(0.3);

    doc.fontSize(9)
       .fillColor(textColor)
       .text(roadmap.interviewPrep, {
         align: 'justify',
         lineGap: 3
       })
       .moveDown(1);
  }

  // Career Advice (if available)
  if (roadmap.careerAdvice) {
    if (doc.y > 650) {
      doc.addPage();
    }

    doc.fontSize(14)
       .fillColor(primaryColor)
       .text('Career Advice', { underline: true })
       .moveDown(0.3);

    doc.fontSize(9)
       .fillColor(textColor)
       .text(roadmap.careerAdvice, {
         align: 'justify',
         lineGap: 3
       })
       .moveDown(1);
  }

  // Footer
  if (doc.y > 700) {
    doc.addPage();
  }

  doc.moveDown(2);
  doc.strokeColor(primaryColor)
     .lineWidth(1)
     .moveTo(50, doc.y)
     .lineTo(545, doc.y)
     .stroke()
     .moveDown(0.5);

  doc.fontSize(8)
     .fillColor('#6B7280')
     .text(`Generated by PrepWiser AI`, { align: 'center' })
     .text(`Created: ${new Date(roadmap.createdAt).toLocaleDateString()}`, { align: 'center' })
     .text(`Last Updated: ${new Date(roadmap.updatedAt).toLocaleDateString()}`, { align: 'center' });
}

export default router;
