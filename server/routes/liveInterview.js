import express from 'express';
import InterviewOrchestrator from '../services/interviewOrchestrator.js';
import InterviewProgress from '../models/InterviewProgress.js';
import SkillGap from '../models/SkillGap.js';
import ConversationalInterview from '../models/ConversationalInterview.js';
import InterviewReport from '../models/InterviewReport.js';
import User from '../models/User.js';
import ReportService from '../services/reportService.js';

const router = express.Router();

/**
 * Real-Time Interview Routes
 * Dynamic, adaptive interviews with NO hard-coded logic
 */

/**
 * POST /api/interview/live/start
 * Start a new adaptive interview session
 */
router.post('/live/start', async (req, res) => {
  try {
    const { userId, resumeId, jobDescriptionId, interviewType } = req.body;
    
    if (!userId || !resumeId) {
      return res.status(400).json({
        success: false,
        error: 'userId and resumeId are required',
      });
    }
    
    const sessionData = await InterviewOrchestrator.startSession({
      userId,
      resumeId,
      jobDescriptionId,
      interviewType: interviewType || 'technical',
    });
    
    res.json({
      success: true,
      data: sessionData,
    });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/interview/live/:sessionId/answer
 * Submit answer and get adaptive next question
 */
router.post('/live/:sessionId/answer', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer, timeSpent } = req.body;
    
    if (!answer) {
      return res.status(400).json({
        success: false,
        error: 'Answer is required',
      });
    }
    
    const result = await InterviewOrchestrator.processAnswer(
      sessionId,
      answer,
      timeSpent || 0
    );
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error processing answer:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/interview/live/:sessionId/status
 * Get current interview state
 */
router.get('/live/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await ConversationalInterview.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }
    
    res.json({
      success: true,
      data: {
        sessionId: session._id,
        status: session.status,
        currentTurn: session.state.currentTurn,
        topicsCovered: session.state.topicsCovered,
        skillsProbed: session.state.skillsProbed,
        difficultyLevel: session.state.difficultyLevel,
        confidenceEstimate: session.state.confidenceEstimate,
        strugglingAreas: session.state.strugglingAreas,
        strongAreas: session.state.strongAreas,
      },
    });
  } catch (error) {
    console.error('Error fetching session status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/interview/live/:sessionId/transcript
 * Get full interview transcript
 */
router.get('/live/:sessionId/transcript', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await ConversationalInterview.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }
    
    const transcript = session.turns.map((turn, index) => ({
      turnNumber: index + 1,
      question: turn.question,
      answer: turn.answer || null,
      evaluation: turn.evaluation ? {
        score: turn.evaluation.overallScore,
        feedback: turn.evaluation.feedback,
      } : null,
      askedAt: turn.askedAt,
    }));
    
    res.json({
      success: true,
      data: {
        sessionId: session._id,
        status: session.status,
        transcript,
        finalEvaluation: session.finalEvaluation,
      },
    });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/interview/progress/:userId/:targetRole
 * Get longitudinal progress for a user and role
 */
router.get('/progress/:userId/:targetRole', async (req, res) => {
  try {
    const { userId, targetRole } = req.params;
    
    const progress = await InterviewProgress.findOne({ userId, targetRole });
    
    if (!progress) {
      return res.json({
        success: true,
        data: {
          hasProgress: false,
          message: 'No interview history for this role yet',
        },
      });
    }
    
    // Calculate current readiness
    const readiness = progress.calculateReadiness();
    
    res.json({
      success: true,
      data: {
        hasProgress: true,
        targetRole: progress.targetRole,
        totalSessions: progress.practiceStats.totalSessions,
        totalQuestions: progress.practiceStats.totalQuestions,
        totalMinutes: progress.practiceStats.totalMinutes,
        currentReadiness: readiness,
        currentStatus: progress.currentStatus,
        scoreTrends: progress.scoreTrends,
        topicMastery: progress.topicMastery,
        improvement: progress.improvement,
        recentSessions: progress.sessions.slice(-5),
      },
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/interview/gaps/:userId
 * Get all identified skill gaps for a user
 */
router.get('/gaps/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    
    const query = { userId };
    if (status) {
      query.status = status;
    }
    
    const gaps = await SkillGap.find(query)
      .sort({ 'recommendation.priority': -1, severity: -1 })
      .limit(20);
    
    // Group by gap type
    const grouped = {
      knowledgeGaps: gaps.filter(g => g.gapType === 'knowledge-gap'),
      explanationGaps: gaps.filter(g => g.gapType === 'explanation-gap'),
      depthGaps: gaps.filter(g => g.gapType === 'depth-gap'),
      other: gaps.filter(g => !['knowledge-gap', 'explanation-gap', 'depth-gap'].includes(g.gapType)),
    };
    
    // Calculate statistics
    const stats = {
      total: gaps.length,
      critical: gaps.filter(g => g.severity === 'critical').length,
      high: gaps.filter(g => g.severity === 'high').length,
      medium: gaps.filter(g => g.severity === 'medium').length,
      low: gaps.filter(g => g.severity === 'low').length,
      byType: {
        knowledge: grouped.knowledgeGaps.length,
        explanation: grouped.explanationGaps.length,
        depth: grouped.depthGaps.length,
        other: grouped.other.length,
      },
    };
    
    res.json({
      success: true,
      data: {
        gaps,
        grouped,
        stats,
      },
    });
  } catch (error) {
    console.error('Error fetching gaps:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PATCH /api/interview/gaps/:gapId/status
 * Update gap status (for tracking progress)
 */
router.patch('/gaps/:gapId/status', async (req, res) => {
  try {
    const { gapId } = req.params;
    const { status, progressNote } = req.body;
    
    const gap = await SkillGap.findById(gapId);
    
    if (!gap) {
      return res.status(404).json({
        success: false,
        error: 'Gap not found',
      });
    }
    
    gap.status = status;
    
    if (progressNote) {
      gap.progressNotes.push({
        date: new Date(),
        note: progressNote,
      });
    }
    
    if (status === 'closed') {
      gap.closedAt = new Date();
    }
    
    await gap.save();
    
    res.json({
      success: true,
      data: gap,
    });
  } catch (error) {
    console.error('Error updating gap:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/interview/sessions/:userId
 * Get all interview sessions for a user
 */
router.get('/sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, limit = 10 } = req.query;
    
    const query = { userId };
    if (status) {
      query.status = status;
    }
    
    const sessions = await ConversationalInterview.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('_id interviewType status createdAt completedAt finalEvaluation state.currentTurn');
    
    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/interview/start
 * Unified session-start endpoint (alias for /live/start).
 * Accepts: userId, resumeId, jobDescription (object or raw text), interviewType, targetRole
 * Returns: sessionId, firstQuestion, context, metadata
 */
router.post('/start', async (req, res) => {
  try {
    const { userId, resumeId, jobDescriptionId, jobDescription, interviewType, targetRole } = req.body;

    if (!userId || !resumeId) {
      return res.status(400).json({
        success: false,
        error: 'userId and resumeId are required',
      });
    }

    const sessionData = await InterviewOrchestrator.startSession({
      userId,
      resumeId,
      jobDescriptionId: jobDescriptionId || null,
      jobDescription: jobDescription || null,
      interviewType: interviewType || 'technical',
      targetRole: targetRole || 'Software Engineer',
    });

    res.status(201).json({
      success: true,
      data: sessionData,
    });
  } catch (error) {
    console.error('[POST /interview/start] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/interview/:sessionId/report
 * Fetch (or generate then fetch) the full report for a completed session.
 * If a report already exists it is returned immediately; otherwise it is generated.
 */
router.get('/:sessionId/report', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.query.userId;        // optional; used for ownership check

    // Check for an existing report first
    let report = await InterviewReport.findOne({ sessionId });

    if (!report) {
      // Attempt to generate one on-the-fly
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'Report not found; provide userId query param to generate it',
        });
      }
      report = await ReportService.generateReport(sessionId, userId);
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('[GET /interview/:id/report] Error:', error);

    if (error.message?.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/interview/history/:userId
 * Return the interview history array from the User document.
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('interviewHistory').lean();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Sort newest first
    const history = (user.interviewHistory || []).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('[GET /interview/history/:userId] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
