import express from 'express';
import multer from 'multer';
import resumeParserService from '../services/resumeParserService.js';
import jdMatcherService from '../services/jdMatcherService.js';
import ParsedResume from '../models/ParsedResume.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOC/DOCX allowed.'));
    }
  },
});

/**
 * POST /api/interview-prep/upload-resume
 * Upload and parse resume
 */
router.post('/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!req.body.userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const { userId } = req.body;
    const { buffer, originalname, mimetype } = req.file;
    
    // Parse resume
    const resume = await resumeParserService.parseResume(
      userId,
      buffer,
      originalname,
      mimetype
    );
    
    res.json({
      success: true,
      resume: {
        id: resume._id,
        parsedData: resume.parsedData,
        atsScore: resume.atsScore,
        uploadDate: resume.originalFile.uploadDate,
      },
    });
    
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/interview-prep/resume/:id/ats-score
 * Get ATS score breakdown
 */
router.get('/resume/:id/ats-score', async (req, res) => {
  try {
    const resume = await ParsedResume.findById(req.params.id);
    
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    // Recalculate ATS score
    const atsScore = resume.calculateATSScore();
    
    res.json({
      success: true,
      atsScore,
    });
    
  } catch (error) {
    console.error('ATS score error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/interview-prep/resume/:id/match-jd
 * Match resume against job description
 */
router.post('/resume/:id/match-jd', async (req, res) => {
  try {
    const { jobDescription } = req.body;
    
    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description required' });
    }
    
    const matchResult = await jdMatcherService.matchResumeToJD(
      req.params.id,
      jobDescription
    );
    
    res.json({
      success: true,
      matchResult,
    });
    
  } catch (error) {
    console.error('JD matching error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/interview-prep/resumes/:userId
 * Get all parsed resumes for user
 */
router.get('/resumes/:userId', async (req, res) => {
  try {
    const resumes = await ParsedResume.find({ userId: req.params.userId })
      .sort({ 'originalFile.uploadDate': -1 })
      .select('originalFile parsedData.contact atsScore.totalScore');
    
    res.json({
      success: true,
      resumes,
    });
    
  } catch (error) {
    console.error('Resume fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/interview-prep/resume/:id
 * Get full resume details
 */
router.get('/resume/:id', async (req, res) => {
  try {
    const resume = await ParsedResume.findById(req.params.id);
    
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    res.json({
      success: true,
      resume,
    });
    
  } catch (error) {
    console.error('Resume fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
