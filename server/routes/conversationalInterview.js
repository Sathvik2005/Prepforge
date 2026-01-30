import express from 'express';
import interviewEngineService from '../services/interviewEngineService.js';
import ConversationalInterview from '../models/ConversationalInterview.js';

const router = express.Router();

/**
 * POST /api/interview/conversational/start
 * Start new conversational interview
 */
router.post('/start', async (req, res) => {
  try {
    const { userId, interviewType, targetRole, resumeId, jobDescription } = req.body;
    
    if (!userId || !interviewType || !targetRole) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, interviewType, targetRole' 
      });
    }
    
    const { interview, firstQuestion } = await interviewEngineService.startInterview(
      userId,
      interviewType,
      targetRole,
      resumeId,
      jobDescription
    );
    
    res.json({
      success: true,
      interviewId: interview._id,
      firstQuestion,
      interview: {
        id: interview._id,
        type: interview.interviewType,
        targetRole: interview.targetRole,
        status: interview.status,
      },
    });
    
  } catch (error) {
    console.error('Interview start error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/interview/conversational/:id/answer
 * Submit answer and get evaluation + next question
 */
router.post('/:id/answer', async (req, res) => {
  try {
    const { answer } = req.body;
    
    if (!answer || !answer.text) {
      return res.status(400).json({ error: 'Answer text required' });
    }
    
    const interview = await ConversationalInterview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    if (interview.status !== 'in-progress') {
      return res.status(400).json({ error: 'Interview not in progress' });
    }
    
    // Get current turn number
    const currentTurnNumber = interview.turns.length;
    
    // Evaluate answer
    const evaluationResult = await interview.evaluateTurn(currentTurnNumber, answer);
    
    // Check if follow-up needed
    if (evaluationResult.needsFollowUp) {
      const followUpQuestion = await interviewEngineService.generateFollowUpQuestion(
        interview.turns[currentTurnNumber],
        interview
      );
      
      res.json({
        success: true,
        evaluation: evaluationResult,
        nextQuestion: followUpQuestion,
        isFollowUp: true,
      });
    } else {
      // Generate next question
      const nextQuestion = await interviewEngineService.generateNextQuestion(interview);
      
      res.json({
        success: true,
        evaluation: evaluationResult,
        nextQuestion,
        isFollowUp: false,
      });
    }
    
  } catch (error) {
    console.error('Answer submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/interview/conversational/:id/complete
 * Complete interview and get final evaluation
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const interview = await ConversationalInterview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    // Calculate final evaluation
    const finalEvaluation = interview.calculateFinalEvaluation();
    
    // Update status
    interview.status = 'completed';
    interview.completedAt = new Date();
    await interview.save();
    
    res.json({
      success: true,
      finalEvaluation,
      analytics: interview.analytics,
    });
    
  } catch (error) {
    console.error('Interview completion error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/interview/conversational/:id
 * Get interview details
 */
router.get('/:id', async (req, res) => {
  try {
    const interview = await ConversationalInterview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    res.json({
      success: true,
      interview,
    });
    
  } catch (error) {
    console.error('Interview fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/interview/conversational/user/:userId
 * Get all interviews for user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const interviews = await ConversationalInterview.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .select('interviewType targetRole status finalEvaluation.scores.overall createdAt completedAt analytics');
    
    res.json({
      success: true,
      interviews,
    });
    
  } catch (error) {
    console.error('Interviews fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
