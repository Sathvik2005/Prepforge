import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import ResumeAnalysis from '../models/ResumeAnalysis.js';
import * as gradioService from '../services/gradioService.js';

const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const fileName = file.originalname.toLowerCase();
    
    if (fileName.endsWith('.pdf') || fileName.endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  }
});

/**
 * POST /api/resume-analysis/upload
 * Upload and process resume file
 */
router.post('/upload', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📄 File uploaded:', req.file.originalname, req.file.mimetype, req.file.size);

    // Detect MIME type from extension if not provided
    let mimeType = req.file.mimetype;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (req.file.originalname.toLowerCase().endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else if (req.file.originalname.toLowerCase().endsWith('.docx')) {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
    }

    // Process resume using Gradio service
    const parsedText = await gradioService.processResume(
      req.file.buffer,
      req.file.originalname,
      mimeType
    );

    res.json({
      success: true,
      parsedText,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    console.error('❌ Error uploading resume:', error);
    res.status(500).json({ 
      error: 'Failed to process resume',
      message: error.message 
    });
  }
});

/**
 * POST /api/resume-analysis/analyze
 * Analyze resume with optional job description
 */
router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const { resumeText, jobDescription, withJobDescription, temperature, maxTokens } = req.body;

    if (!resumeText) {
      return res.status(400).json({ error: 'Resume text is required' });
    }

    const analysis = await gradioService.analyzeResume(
      resumeText,
      jobDescription || '',
      withJobDescription || false,
      temperature || 0.5,
      maxTokens || 1024
    );

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('❌ Error analyzing resume:', error);
    res.status(500).json({ 
      error: 'Failed to analyze resume',
      message: error.message 
    });
  }
});

/**
 * POST /api/resume-analysis/rephrase
 * Rephrase resume text
 */
router.post('/rephrase', authMiddleware, async (req, res) => {
  try {
    const { text, temperature, maxTokens } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const rephrased = await gradioService.rephraseText(
      text,
      temperature || 0.5,
      maxTokens || 1024
    );

    res.json({
      success: true,
      rephrased
    });
  } catch (error) {
    console.error('❌ Error rephrasing text:', error);
    res.status(500).json({ 
      error: 'Failed to rephrase text',
      message: error.message 
    });
  }
});

/**
 * POST /api/resume-analysis/cover-letter
 * Generate cover letter
 */
router.post('/cover-letter', authMiddleware, async (req, res) => {
  try {
    const { resumeText, jobDescription, temperature, maxTokens } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: 'Resume text and job description are required' });
    }

    const coverLetter = await gradioService.generateCoverLetter(
      resumeText,
      jobDescription,
      temperature || 0.7,
      maxTokens || 2000
    );

    res.json({
      success: true,
      coverLetter
    });
  } catch (error) {
    console.error('❌ Error generating cover letter:', error);
    res.status(500).json({ 
      error: 'Failed to generate cover letter',
      message: error.message 
    });
  }
});

/**
 * POST /api/resume-analysis/interview-questions
 * Generate interview questions
 */
router.post('/interview-questions', authMiddleware, async (req, res) => {
  try {
    const { jobDescription, temperature, maxTokens } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    const questions = await gradioService.generateInterviewQuestions(
      jobDescription,
      temperature || 0.6,
      maxTokens || 1500
    );

    res.json({
      success: true,
      questions
    });
  } catch (error) {
    console.error('❌ Error generating interview questions:', error);
    res.status(500).json({ 
      error: 'Failed to generate interview questions',
      message: error.message 
    });
  }
});

/**
 * POST /api/resume-analysis/autofill-jd
 * Auto-fill job description from URL
 */
router.post('/autofill-jd', authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const jobDescription = await gradioService.autoFillJobDescription(url);

    res.json({
      success: true,
      jobDescription
    });
  } catch (error) {
    console.error('❌ Error auto-filling job description:', error);
    res.status(500).json({ 
      error: 'Failed to auto-fill job description',
      message: error.message 
    });
  }
});

/**
 * POST /api/resume-analysis/save
 * Save analyzed resume data
 */
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const {
      resumeText,
      jobDescription,
      analysis,
      fileName,
      fileSize,
      provenance,
      coverLetter,
      interviewQuestions,
      rephrased
    } = req.body;

    const userId = req.user.firebaseUid || req.user.id;

    if (!resumeText) {
      return res.status(400).json({ error: 'Resume text is required' });
    }

    const resumeAnalysis = new ResumeAnalysis({
      userId,
      resumeText,
      jobDescription,
      fileName,
      fileSize,
      analysis: analysis ? {
        general: analysis.general,
        withJD: analysis.withJD,
        lastUpdated: new Date()
      } : undefined,
      coverLetter: coverLetter ? {
        content: coverLetter,
        generatedAt: new Date()
      } : undefined,
      interviewQuestions: interviewQuestions ? {
        content: interviewQuestions,
        generatedAt: new Date()
      } : undefined,
      rephrased: rephrased || [],
      provenance: provenance || {
        hfSpace: 'thisrudrapatel/Resume-Genome',
        endpointsUsed: [],
        timestamp: new Date()
      },
      status: 'saved'
    });

    resumeAnalysis.addAudit('created', { source: 'resume-toolkit' });
    await resumeAnalysis.save();

    // Emit Socket.IO event if available
    if (req.app.get('io')) {
      req.app.get('io').emit('resume:processed', {
        userId,
        resumeId: resumeAnalysis._id
      });
    }

    res.status(201).json({
      success: true,
      resumeId: resumeAnalysis._id,
      message: 'Resume analysis saved successfully'
    });
  } catch (error) {
    console.error('Error saving resume analysis:', error);
    res.status(500).json({ error: 'Failed to save resume analysis' });
  }
});

/**
 * GET /api/resume/:id
 * Get specific resume analysis by ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.firebaseUid || req.user.id;

    const resume = await ResumeAnalysis.findById(id);

    if (!resume) {
      return res.status(404).json({ error: 'Resume analysis not found' });
    }

    // Verify ownership
    if (resume.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      resume
    });
  } catch (error) {
    console.error('Error fetching resume analysis:', error);
    res.status(500).json({ error: 'Failed to fetch resume analysis' });
  }
});

/**
 * GET /api/resume/user/:userId
 * Get all resume analyses for a user
 */
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestUserId = req.user.firebaseUid || req.user.id;

    // Verify user can only access their own resumes
    if (userId !== requestUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const resumes = await ResumeAnalysis.find({ userId })
      .sort({ createdAt: -1 })
      .select('-resumeText -analysis'); // Exclude large text fields in list

    res.json({
      success: true,
      resumes,
      count: resumes.length
    });
  } catch (error) {
    console.error('Error fetching user resumes:', error);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

/**
 * PATCH /api/resume/:id
 * Update resume analysis
 */
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.firebaseUid || req.user.id;
    const updates = req.body;

    const resume = await ResumeAnalysis.findById(id);

    if (!resume) {
      return res.status(404).json({ error: 'Resume analysis not found' });
    }

    // Verify ownership
    if (resume.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update allowed fields
    const allowedUpdates = ['analysis', 'coverLetter', 'interviewQuestions', 'rephrased', 'notes', 'tags', 'status'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        resume[key] = updates[key];
      }
    });

    resume.addAudit('updated', { fields: Object.keys(updates) });
    await resume.save();

    res.json({
      success: true,
      resume
    });
  } catch (error) {
    console.error('Error updating resume analysis:', error);
    res.status(500).json({ error: 'Failed to update resume analysis' });
  }
});

/**
 * DELETE /api/resume/:id
 * Delete resume analysis
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.firebaseUid || req.user.id;

    const resume = await ResumeAnalysis.findById(id);

    if (!resume) {
      return res.status(404).json({ error: 'Resume analysis not found' });
    }

    // Verify ownership
    if (resume.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await ResumeAnalysis.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Resume analysis deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting resume analysis:', error);
    res.status(500).json({ error: 'Failed to delete resume analysis' });
  }
});

export default router;
