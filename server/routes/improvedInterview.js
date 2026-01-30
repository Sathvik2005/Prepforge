/**
 * INTERVIEW API ROUTES (REST Alternative)
 * 
 * HTTP endpoints for interview management:
 * - POST /api/interviews/start - Start new interview
 * - POST /api/interviews/:id/answer - Submit answer
 * - GET /api/interviews/:id - Get interview details
 * - POST /api/interviews/:id/end - End interview
 * - GET /api/interviews/analytics/:userId - Get analytics
 */

import express from 'express';
import ImprovedInterviewOrchestrator from '../services/improvedInterviewOrchestrator.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/interviews/start
 * @desc    Start new interview session
 * @access  Private
 */
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { resumeId, jobDescriptionId, interviewType } = req.body;
    
    const userId = req.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (!resumeId) {
      return res.status(400).json({
        success: false,
        error: 'resumeId is required'
      });
    }
    
    const result = await ImprovedInterviewOrchestrator.startSession({
      userId,
      resumeId,
      jobDescriptionId,
      interviewType: interviewType || 'technical',
      socketId: null  // HTTP mode
    });
    
    res.status(201).json({
      success: true,
      data: {
        sessionId: result.sessionId,
        firstQuestion: result.question,
        context: result.context,
        metadata: result.metadata
      },
      message: 'Interview started successfully'
    });
    
  } catch (error) {
    console.error('Interview start error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/interviews/:id/answer
 * @desc    Submit answer to current question
 * @access  Private
 */
router.post('/:id/answer', authMiddleware, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { answer, timeSpent } = req.body;
    
    if (!answer) {
      return res.status(400).json({
        success: false,
        error: 'answer is required'
      });
    }
    
    const result = await ImprovedInterviewOrchestrator.processAnswer({
      sessionId,
      answer,
      timeSpent: timeSpent || 0
    });
    
    // Format response based on result type
    const response = {
      success: true,
      data: {
        type: result.type,
        evaluation: result.evaluation
      }
    };
    
    if (result.type === 'interview_complete') {
      response.data.summary = result.summary;
      response.message = 'Interview completed';
    } else if (result.type === 'follow_up') {
      response.data.nextQuestion = result.nextQuestion;
      response.data.context = result.context;
      response.message = 'Follow-up question generated';
    } else {
      response.data.nextQuestion = result.nextQuestion;
      response.data.context = result.context;
      response.message = 'Answer evaluated, next question ready';
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Answer submission error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/interviews/:id
 * @desc    Get interview session details
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    const session = await ImprovedInterviewOrchestrator.getSession(sessionId);
    
    res.json({
      success: true,
      data: session
    });
    
  } catch (error) {
    console.error('Session retrieval error:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/interviews/:id/end
 * @desc    End interview session early
 * @access  Private
 */
router.post('/:id/end', authMiddleware, async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    const result = await ImprovedInterviewOrchestrator.endSession(sessionId);
    
    res.json({
      success: true,
      data: result,
      message: 'Interview ended'
    });
    
  } catch (error) {
    console.error('Interview end error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/interviews/analytics/:userId
 * @desc    Get interview analytics for user
 * @access  Private
 */
router.get('/analytics/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    const filters = {
      status: req.query.status,
      interviewType: req.query.interviewType,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    };
    
    // Verify user can access this data
    const requestUserId = req.userId || req.user?.id;
    if (requestUserId !== userId && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const analytics = await ImprovedInterviewOrchestrator.getAnalytics(userId, filters);
    
    res.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    console.error('Analytics retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
