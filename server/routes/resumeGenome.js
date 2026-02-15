/**
 * Resume Genome Routes - Clean Single Provider Architecture
 * Production-ready resume processing with stable error handling
 */

import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import axios from 'axios';
import * as cheerio from 'cheerio';
import PDFDocument from 'pdfkit';
import { authMiddleware } from '../middleware/auth.js';
import { uploadLimiter, aiLimiter } from '../middleware/rateLimiter.js';
import { 
  sanitizeText, 
  validateTextLength,
  containsMaliciousContent 
} from '../utils/validation.js';
import ResumeAnalysis from '../models/ResumeAnalysis.js';
import * as groqService from '../services/groqService.js';

const router = express.Router();

// ============= MULTER CONFIGURATION =============

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const fileName = file.originalname.toLowerCase();
    if (fileName.endsWith('.pdf') || fileName.endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  }
});

// ============= PARSING HELPERS =============

/**
 * Parse PDF file safely
 */
async function parsePDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error) {
    console.error('PDF parsing error:', error.message);
    throw new Error('Failed to parse PDF file. Please ensure it is not password protected.');
  }
}

/**
 * Parse DOCX file safely
 */
async function parseDOCX(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (error) {
    console.error('DOCX parsing error:', error.message);
    throw new Error('Failed to parse DOCX file. Please ensure it is not corrupted.');
  }
}

/**
 * Get safe empty resume structure
 */
function getEmptyResumeStructure() {
  return {
    text: '',
    sections: {
      summary: '',
      experience: [],
      education: [],
      skills: [],
      certifications: []
    }
  };
}

// ============= ROUTES =============

/**
 * POST /process-resume
 * Upload and parse resume file (PDF/DOCX)
 */
router.post('/process-resume', uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    console.log('📄 Processing resume upload...');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file provided. Please upload a PDF or DOCX file.' 
      });
    }

    console.log(`📄 File: ${req.file.originalname} (${req.file.size} bytes, ${req.file.mimetype})`);

    let parsedText = '';
    
    // Parse based on file type
    if (req.file.mimetype === 'application/pdf') {
      console.log('📑 Parsing PDF...');
      parsedText = await parsePDF(req.file.buffer);
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('📄 Parsing DOCX...');
      parsedText = await parseDOCX(req.file.buffer);
    } else {
      return res.status(400).json({ 
        success: false,
        message: 'Unsupported file type. Please upload PDF or DOCX.' 
      });
    }

    // Clean and validate text
    parsedText = parsedText.trim().replace(/\s+/g, ' ');

    if (!parsedText || parsedText.length < 50) {
      console.warn('⚠️ Extracted text too short:', parsedText.length, 'characters');
      return res.status(400).json({ 
        success: false,
        message: 'Could not extract meaningful text from the document.',
        details: 'The file may be empty, corrupted, or contain only images. Please try a different file.'
      });
    }

    console.log(`✅ Resume parsed successfully (${parsedText.length} characters)`);
    
    res.json({ 
      success: true, 
      data: parsedText,
      metadata: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        textLength: parsedText.length
      }
    });

  } catch (error) {
    console.error('❌ Resume processing error:', error.message);
    
    // Return safe error response
    res.status(200).json({ 
      success: false,
      message: 'Failed to process resume',
      error: error.message || 'Unknown error occurred',
      safeFallback: true
    });
  }
});

/**
 * POST /analyze
 * Analyze resume with optional job description
 */
router.post('/analyze', aiLimiter, async (req, res) => {
  try {
    let { resumeText, jobDescription, withJobDescription, temperature, maxTokens } = req.body;

    // Validate resume text
    if (!resumeText || typeof resumeText !== 'string') {
      return res.status(400).json({ 
        success: false,
        message: 'Resume text is required' 
      });
    }

    const resumeValidation = validateTextLength(resumeText, 50000);
    if (!resumeValidation.valid) {
      return res.status(400).json({ 
        success: false,
        message: resumeValidation.error 
      });
    }

    // Check for malicious content
    if (containsMaliciousContent(resumeText)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid content detected in resume' 
      });
    }

    // Sanitize inputs
    resumeText = sanitizeText(resumeText);
    jobDescription = jobDescription ? sanitizeText(jobDescription) : '';

    // Validate parameters
    if (temperature !== undefined) {
      temperature = Math.max(0, Math.min(2, parseFloat(temperature) || 0.7));
    }
    if (maxTokens !== undefined) {
      maxTokens = Math.max(100, Math.min(4000, parseInt(maxTokens) || 2000));
    }

    console.log('🔍 Analyzing resume...', {
      resumeLength: resumeText.length,
      hasJD: !!jobDescription,
      withJobDescription,
      temperature,
      maxTokens
    });

    // Use comprehensive skill gap analysis if job description provided
    if (withJobDescription && jobDescription) {
      console.log('🎯 Using comprehensive skill gap analysis...');
      
      const skillGapResult = await analyzeSkillGap(resumeText, jobDescription);
      
      console.log('✅ Skill gap analysis complete');
      
      res.json({
        success: true,
        data: {
          skillGap: skillGapResult.data,
          type: 'skillGapAnalysis'
        },
        metadata: skillGapResult.metadata
      });
    } else {
      // Regular resume analysis without job description
      const result = await groqService.analyzeResume(
        resumeText,
        '',
        { temperature, maxTokens }
      );

      console.log('✅ Analysis complete');

      res.json({
        success: true,
        data: result.analysis,
        metadata: result.metadata
      });
    }

  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    
    // Return safe fallback with basic analysis
    const fallbackAnalysis = `**Resume Overview**

Your resume has been processed successfully. Here's a general assessment:

**✅ Parsed Successfully**
The resume contains ${resumeText.length} characters of content.

**📋 General Feedback**
- Resume format appears readable
- Content structure is present
- Consider adding quantifiable achievements
- Ensure all sections are complete

**💡 Recommendations**
- Use strong action verbs (Led, Developed, Implemented)
- Add metrics and numbers to demonstrate impact
- Tailor content to specific job requirements
- Keep formatting clean and ATS-friendly

**Note:** AI analysis is temporarily limited. This is a basic assessment.`;

    res.status(200).json({
      success: true,
      data: fallbackAnalysis,
      metadata: {
        provider: 'fallback',
        degradedMode: true,
        cached: false
      }
    });
  }
});

/**
 * POST /rephrase
 * Rephrase text with professional improvements
 */
router.post('/rephrase', aiLimiter, async (req, res) => {
  try {
    const { text, temperature, maxTokens } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        success: false,
        message: 'Text is required' 
      });
    }

    if (text.length < 10) {
      return res.status(400).json({ 
        success: false,
        message: 'Text is too short to rephrase' 
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({ 
        success: false,
        message: 'Text is too long. Maximum 5000 characters.' 
      });
    }

    console.log('✍️ Rephrasing text...', { length: text.length });

    // Call AI service
    const result = await groqService.rephraseText(text, { temperature, maxTokens });

    // Split into bullet points
    const bullets = result.rephrased
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 10)
      .map(line => line.replace(/^[\d\-\*\.\)]+\s*/, '').trim());

    console.log(`✅ Rephrased (${bullets.length} bullets)`);

    res.json({
      success: true,
      data: bullets,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('❌ Rephrase error:', error.message);
    
    // Return safe fallback
    res.status(200).json({
      success: false,
      message: 'Rephrase service temporarily unavailable',
      error: error.message,
      safeFallback: true,
      data: []
    });
  }
});

/**
 * POST /cover-letter
 * Generate cover letter from resume and job description
 */
router.post('/cover-letter', aiLimiter, async (req, res) => {
  try {
    const { resumeText, jobDescription, temperature, maxTokens } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ 
        success: false,
        message: 'Resume text and job description are required' 
      });
    }

    console.log('📧 Generating cover letter...', {
      resumeLength: resumeText.length,
      jdLength: jobDescription.length
    });

    // Call AI service
    const result = await groqService.generateCoverLetter(resumeText, jobDescription, {
      temperature,
      maxTokens
    });

    console.log('✅ Cover letter generated');

    res.json({
      success: true,
      data: result.coverLetter,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('❌ Cover letter error:', error.message);
    
    // Return safe fallback
    res.status(200).json({
      success: false,
      message: 'Cover letter generation temporarily unavailable',
      error: error.message,
      safeFallback: true,
      data: 'Cover letter generation service is currently unavailable. Please try again later.'
    });
  }
});

/**
 * POST /interview-questions
 * Generate interview questions and answers
 */
router.post('/interview-questions', aiLimiter, async (req, res) => {
  try {
    const { resumeText, jobDescription, temperature, maxTokens } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ 
        success: false,
        message: 'Resume text and job description are required' 
      });
    }

    console.log('💬 Generating interview Q&A...', {
      resumeLength: resumeText.length,
      jdLength: jobDescription.length
    });

    // Call AI service
    const result = await groqService.generateInterviewQA(resumeText, jobDescription, {
      temperature,
      maxTokens
    });

    console.log('✅ Interview Q&A generated');

    res.json({
      success: true,
      data: result.interviewQA,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('❌ Interview Q&A error:', error.message);
    
    // Return error response (frontend will handle gracefully)
    res.status(500).json({
      success: false,
      message: 'Interview Q&A generation failed',
      error: error.message,
      safeFallback: false
    });
  }
});

/**
 * POST /auto-fill-jd
 * Auto-fill job description from URL
 */
router.post('/auto-fill-jd', aiLimiter, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ 
        success: false,
        message: 'URL is required' 
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid URL format' 
      });
    }

    console.log('🔗 Fetching job description from:', url);
    
    // Fetch webpage with timeout
    const response = await Promise.race([
      axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxRedirects: 3
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      )
    ]);

    const $ = cheerio.load(response.data);
    
    // Remove unnecessary elements
    $('script, style, nav, header, footer, aside, .nav, .navigation, .menu').remove();
    
    // Try common job description selectors
    let jobDesc = '';
    const selectors = [
      '[class*="job-description"]',
      '[id*="job-description"]',
      '[class*="description"]',
      'article',
      'main',
      '[class*="content"]'
    ];
    
    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        jobDesc = element.text().trim();
        if (jobDesc.length > 200) break;
      }
    }
    
    // Fallback to body text
    if (!jobDesc || jobDesc.length < 200) {
      jobDesc = $('body').text().trim();
    }
    
    // Clean text
    jobDesc = jobDesc
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .substring(0, 8000);
    
    if (!jobDesc || jobDesc.length < 100) {
      return res.status(400).json({ 
        success: false,
        message: 'Could not extract job description from URL',
        details: 'The page may not contain a job posting or content is protected'
      });
    }

    // Use AI to clean and format
    const result = await groqService.createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert at extracting job descriptions. Extract and format the job posting including title, responsibilities, requirements, and qualifications.'
      },
      {
        role: 'user',
        content: `Extract the job description from this text:\n\n${jobDesc}`
      }
    ], {
      temperature: 0.3,
      max_tokens: 2000
    });

    console.log('✅ Job description extracted');

    res.json({ 
      success: true, 
      data: result.content 
    });

  } catch (error) {
    console.error('❌ Auto-fill error:', error.message);
    
    res.status(200).json({ 
      success: false,
      message: 'Failed to fetch job description',
      error: error.message,
      safeFallback: true
    });
  }
});

/**
 * POST /save
 * Save resume analysis (requires authentication)
 */
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const {
      resumeText,
      jobDescription,
      analysis,
      fileName,
      fileSize,
      coverLetter,
      interviewQuestions,
      rephrased
    } = req.body;

    const userId = req.user.firebaseUid || req.user.id;

    if (!resumeText) {
      return res.status(400).json({ 
        success: false,
        message: 'Resume text is required' 
      });
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

    console.log('✅ Resume analysis saved:', resumeAnalysis._id);

    res.status(201).json({
      success: true,
      resumeId: resumeAnalysis._id,
      message: 'Resume analysis saved successfully'
    });

  } catch (error) {
    console.error('❌ Save error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to save resume analysis',
      error: error.message 
    });
  }
});

/**
 * POST /pdf-report
 * Generate PDF report of resume analysis
 */
router.post('/pdf-report', async (req, res) => {
  try {
    const { analysisOutput, jobDescription, resumeText } = req.body;

    if (!analysisOutput && !resumeText) {
      return res.status(400).json({ 
        success: false,
        message: 'No data provided for report generation' 
      });
    }

    console.log('📄 Generating PDF report...');

    const doc = new PDFDocument({ margin: 50 });
    
    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=resume-analysis-${Date.now()}.pdf`);
    
    // Pipe to response
    doc.pipe(res);

    // Title
    doc.fontSize(24).fillColor('#2563eb').text('Resume Analysis Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).fillColor('#6b7280').text(
      `Generated on ${new Date().toLocaleDateString()}`,
      { align: 'center' }
    );
    doc.moveDown(2);

    // Resume content
    if (resumeText) {
      doc.fontSize(16).fillColor('#1f2937').text('Resume Content', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#374151').text(
        resumeText.substring(0, 2000) + (resumeText.length > 2000 ? '...' : '')
      );
      doc.moveDown(2);
    }

    // Job description
    if (jobDescription) {
      doc.fontSize(16).fillColor('#1f2937').text('Target Job Description', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#374151').text(
        jobDescription.substring(0, 2000) + (jobDescription.length > 2000 ? '...' : '')
      );
      doc.moveDown(2);
    }

    // Analysis
    if (analysisOutput) {
      doc.addPage();
      doc.fontSize(16).fillColor('#1f2937').text('AI Analysis Results', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#374151').text(analysisOutput, { align: 'justify' });
    }

    // Footer
    doc.fontSize(8).fillColor('#9ca3af').text(
      'Generated by PrepWiser Resume Toolkit - Powered by OpenAI',
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();
    console.log('✅ PDF generated');

  } catch (error) {
    console.error('❌ PDF generation error:', error.message);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        message: 'Failed to generate PDF',
        error: error.message 
      });
    }
  }
});

/**
 * GET /health
 * Check AI service health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await groqService.healthCheck();
    res.json({
      success: true,
      service: 'resume-genome',
      ai: health,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'resume-genome',
      error: error.message
    });
  }
});

export default router;
