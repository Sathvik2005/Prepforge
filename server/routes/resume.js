import express from 'express';
import Resume from '../models/Resume.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  enhanceBulletPoint,
  generateSummary,
  optimizeForJob,
  generateProjectDescription,
  extractSkillsFromJob,
  enhanceBulletPoints,
} from '../services/resumeService.js';

const router = express.Router();

// Get all resumes for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const resumes = await Resume.find({ userId }).sort({ isPrimary: -1, updatedAt: -1 });
    
    res.json({ resumes, count: resumes.length });
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

// Get single resume
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const resume = await Resume.findOne({ _id: req.params.id, userId });
    
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    res.json({ resume });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// Create new resume
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const resumeData = req.body;
    
    // If this is the first resume, make it primary
    const existingResumes = await Resume.countDocuments({ userId });
    if (existingResumes === 0) {
      resumeData.isPrimary = true;
    }
    
    const resume = new Resume({
      ...resumeData,
      userId,
    });
    
    await resume.save();
    
    res.status(201).json({ resume, message: 'Resume created successfully' });
  } catch (error) {
    console.error('Create resume error:', error);
    res.status(500).json({ error: 'Failed to create resume' });
  }
});

// Update resume
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const resumeData = req.body;
    
    const resume = await Resume.findOne({ _id: req.params.id, userId });
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    // Update fields
    Object.assign(resume, resumeData);
    await resume.save();
    
    res.json({ resume, message: 'Resume updated successfully' });
  } catch (error) {
    console.error('Update resume error:', error);
    res.status(500).json({ error: 'Failed to update resume' });
  }
});

// Delete resume
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const resume = await Resume.findOneAndDelete({ _id: req.params.id, userId });
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

// Set primary resume
router.post('/:id/set-primary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Unset all primary flags
    await Resume.updateMany({ userId }, { isPrimary: false });
    
    // Set this one as primary
    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, userId },
      { isPrimary: true },
      { new: true }
    );
    
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    res.json({ resume, message: 'Primary resume updated' });
  } catch (error) {
    console.error('Set primary error:', error);
    res.status(500).json({ error: 'Failed to set primary resume' });
  }
});

// Duplicate resume
router.post('/:id/duplicate', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const original = await Resume.findOne({ _id: req.params.id, userId });
    if (!original) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    const duplicate = new Resume({
      ...original.toObject(),
      _id: undefined,
      title: `${original.title} (Copy)`,
      isPrimary: false,
      createdAt: undefined,
      updatedAt: undefined,
    });
    
    await duplicate.save();
    
    res.status(201).json({ resume: duplicate, message: 'Resume duplicated successfully' });
  } catch (error) {
    console.error('Duplicate resume error:', error);
    res.status(500).json({ error: 'Failed to duplicate resume' });
  }
});

// AI: Enhance bullet point
router.post('/ai/enhance-bullet', authMiddleware, async (req, res) => {
  try {
    const { bulletPoint, context } = req.body;
    
    if (!bulletPoint) {
      return res.status(400).json({ error: 'Bullet point is required' });
    }
    
    const result = await enhanceBulletPoint(bulletPoint, context);
    
    res.json(result);
  } catch (error) {
    console.error('Enhance bullet point error:', error);
    res.status(500).json({ error: 'Failed to enhance bullet point' });
  }
});

// AI: Generate summary
router.post('/ai/generate-summary', authMiddleware, async (req, res) => {
  try {
    const { profile } = req.body;
    
    const result = await generateSummary(profile);
    
    res.json(result);
  } catch (error) {
    console.error('Generate summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// AI: Optimize for job
router.post('/:id/optimize', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobDescription } = req.body;
    
    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }
    
    const resume = await Resume.findOne({ _id: req.params.id, userId });
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    // Store job description
    resume.targetJobDescription = jobDescription;
    
    // Calculate ATS score
    resume.calculateATSScore(jobDescription);
    
    // Extract keywords
    resume.extractKeywords(jobDescription);
    
    // Get AI suggestions
    const optimization = await optimizeForJob(resume.toObject(), jobDescription);
    
    await resume.save();
    
    res.json({
      atsScore: resume.atsScore,
      matchedKeywords: resume.matchedKeywords,
      missingKeywords: resume.missingKeywords,
      suggestions: optimization.suggestions,
      aiGenerated: optimization.aiGenerated,
    });
  } catch (error) {
    console.error('Optimize resume error:', error);
    res.status(500).json({ error: 'Failed to optimize resume' });
  }
});

// AI: Generate project description
router.post('/ai/generate-project', authMiddleware, async (req, res) => {
  try {
    const { projectName, technologies } = req.body;
    
    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const result = await generateProjectDescription(projectName, technologies);
    
    res.json(result);
  } catch (error) {
    console.error('Generate project error:', error);
    res.status(500).json({ error: 'Failed to generate project description' });
  }
});

// AI: Extract skills from job
router.post('/ai/extract-skills', authMiddleware, async (req, res) => {
  try {
    const { jobDescription } = req.body;
    
    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }
    
    const result = await extractSkillsFromJob(jobDescription);
    
    res.json(result);
  } catch (error) {
    console.error('Extract skills error:', error);
    res.status(500).json({ error: 'Failed to extract skills' });
  }
});

// AI: Batch enhance bullet points
router.post('/ai/enhance-bullets', authMiddleware, async (req, res) => {
  try {
    const { bulletPoints, context } = req.body;
    
    if (!bulletPoints || !Array.isArray(bulletPoints)) {
      return res.status(400).json({ error: 'Bullet points array is required' });
    }
    
    const results = await enhanceBulletPoints(bulletPoints, context);
    
    res.json({ results });
  } catch (error) {
    console.error('Batch enhance error:', error);
    res.status(500).json({ error: 'Failed to enhance bullet points' });
  }
});

// Calculate ATS score
router.post('/:id/ats-score', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobDescription } = req.body;
    
    const resume = await Resume.findOne({ _id: req.params.id, userId });
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    const atsScore = resume.calculateATSScore(jobDescription);
    const keywords = resume.extractKeywords(jobDescription);
    
    if (jobDescription) {
      resume.targetJobDescription = jobDescription;
    }
    
    await resume.save();
    
    res.json({
      atsScore,
      matchedKeywords: keywords.matched,
      missingKeywords: keywords.missing,
    });
  } catch (error) {
    console.error('Calculate ATS score error:', error);
    res.status(500).json({ error: 'Failed to calculate ATS score' });
  }
});

export default router;
