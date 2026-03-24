/**
 * mockInterviews.js  – Extended mock interview routes with AI capabilities.
 * Mounted at: /api/mock-interviews
 * Does NOT touch any other interview routes.
 */
import express from 'express';
import { authMiddleware as authenticate } from '../middleware/auth.js';
import MockInterview from '../models/MockInterview.js';
import MockInterviewReport from '../models/MockInterviewReport.js';
import User from '../models/User.js';
import {
  generateQuestion,
  generateCodingProblem,
  evaluateAnswer,
  generateFollowUp,
  adaptDifficulty,
  generateSessionReport,
} from '../services/mockInterviewAIService.js';

const router = express.Router();

/* ─────────────────────────────────────────────────────────────
   AI: Generate next question
   POST /api/mock-interviews/:id/ai/question
───────────────────────────────────────────────────────────── */
router.post('/:id/ai/question', authenticate, async (req, res) => {
  try {
    const session = await MockInterview.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const {
      difficulty = session.difficulty || 'medium',
      askedQuestions = [],
      resumeText = '',
      jobDescription = '',
      skillGaps = [],
    } = req.body;

    const question = await generateQuestion({
      interviewType: session.type,
      targetRole: session.topics?.[0] || 'Software Engineer',
      difficulty,
      askedQuestions,
      resumeText,
      jobDescription,
      skillGaps,
    });

    res.json({ success: true, data: question });
  } catch (err) {
    console.error('[mockInterviewAI] generateQuestion error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   AI: Generate coding problem
   POST /api/mock-interviews/:id/ai/coding-problem
───────────────────────────────────────────────────────────── */
router.post('/:id/ai/coding-problem', authenticate, async (req, res) => {
  try {
    const session = await MockInterview.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const { difficulty = session.difficulty || 'medium', topics = session.topics || [] } = req.body;

    const problem = await generateCodingProblem({
      targetRole: session.topics?.[0] || 'Software Engineer',
      difficulty,
      topics,
    });

    res.json({ success: true, data: problem });
  } catch (err) {
    console.error('[mockInterviewAI] generateCodingProblem error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   AI: Evaluate answer + optional follow-up
   POST /api/mock-interviews/:id/ai/evaluate
───────────────────────────────────────────────────────────── */
router.post('/:id/ai/evaluate', authenticate, async (req, res) => {
  try {
    const { questionText, questionType, answerText, expectedTopics = [], generateFollowUpQ = true } = req.body;

    const evaluation = await evaluateAnswer({ questionText, questionType, answerText, expectedTopics });

    let followUpQuestion = null;
    if (generateFollowUpQ) {
      followUpQuestion = await generateFollowUp(questionText, answerText, evaluation);
    }

    res.json({ success: true, data: { evaluation, followUpQuestion } });
  } catch (err) {
    console.error('[mockInterviewAI] evaluateAnswer error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   AI: Get next difficulty
   POST /api/mock-interviews/ai/difficulty
───────────────────────────────────────────────────────────── */
router.post('/ai/difficulty', authenticate, async (req, res) => {
  try {
    const { recentScores = [], currentDifficulty = 'medium' } = req.body;
    const nextDifficulty = adaptDifficulty(recentScores, currentDifficulty);
    res.json({ success: true, data: { nextDifficulty } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   Generate + Save Full Report
   POST /api/mock-interviews/:id/report/generate
───────────────────────────────────────────────────────────── */
router.post('/:id/report/generate', authenticate, async (req, res) => {
  try {
    const session = await MockInterview.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const { turns = [], codingProblems = [], durationSeconds = 0 } = req.body;

    const reportData = await generateSessionReport(session.toObject(), turns, codingProblems, durationSeconds);

    // Upsert (generate once, retrieve after)
    let report = await MockInterviewReport.findOne({ mockInterviewId: req.params.id });
    if (!report) {
      report = await MockInterviewReport.create(reportData);
    }

    // Persist to user history
    const userId = session.interviewee;
    await User.findByIdAndUpdate(userId, {
      $push: {
        interviewHistory: {
          $each: [{
            interviewId: session._id,
            reportId: report._id,
            type: 'mock',
            role: reportData.targetRole,
            date: new Date(),
            overallScore: reportData.overallScore,
            readinessLabel: reportData.readinessLabel,
            durationSeconds: reportData.durationSeconds,
          }],
          $position: 0,
          $slice: 50,
        },
      },
    });

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('[mockInterviewAI] generateReport error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   Get Report
   GET /api/mock-interviews/:id/report
───────────────────────────────────────────────────────────── */
router.get('/:id/report', authenticate, async (req, res) => {
  try {
    const report = await MockInterviewReport.findOne({ mockInterviewId: req.params.id }).lean();
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   Get user's mock interview history (with reports)
   GET /api/mock-interviews/history/me
───────────────────────────────────────────────────────────── */
router.get('/history/me', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const reports = await MockInterviewReport.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   Existing routes passthrough (queue, create, get, etc.)
   These are defined separately in the original interviews.js –
   we just add our AI augments here.
───────────────────────────────────────────────────────────── */

// Job queue
router.post('/queue/join', authenticate, async (req, res) => {
  try {
    const { type, difficulty, topics, scheduledTime } = req.body;
    const userId = req.user._id || req.user.id;

    const session = await MockInterview.create({
      interviewer: userId,
      interviewee: userId,
      type: type || 'technical',
      difficulty: difficulty || 'medium',
      topics: topics || [],
      scheduledTime: scheduledTime || new Date(Date.now() + 60000),
      status: 'waiting',
      matchedBy: 'auto',
    });

    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/queue/leave', authenticate, async (req, res) => {
  res.json({ success: true });
});

router.post('/create', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { type, difficulty, topics, scheduledTime, duration } = req.body;

    const session = await MockInterview.create({
      interviewer: userId,
      interviewee: userId,
      type: type || 'technical',
      difficulty: difficulty || 'medium',
      topics: topics || [],
      scheduledTime: scheduledTime || new Date(),
      duration: duration || 45,
      status: 'scheduled',
      matchedBy: 'manual',
    });

    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const sessions = await MockInterview.findUpcoming(userId);
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/past', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const sessions = await MockInterview.findPast(userId);
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/stats/me', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const stats = await MockInterview.getUserStats(userId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const session = await MockInterview.findById(req.params.id)
      .populate('interviewer interviewee', 'name email avatar')
      .lean();
    if (!session) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await MockInterview.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/start', authenticate, async (req, res) => {
  try {
    const session = await MockInterview.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Not found' });
    await session.startInterview();
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/end', authenticate, async (req, res) => {
  try {
    const session = await MockInterview.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Not found' });
    await session.endInterview();
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/switch-roles', authenticate, async (req, res) => {
  try {
    const session = await MockInterview.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Not found' });
    await session.switchRoles();
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/feedback', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const session = await MockInterview.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Not found' });
    const { ratings, strengths, improvements, comments, targetUserId } = req.body;
    await session.addFeedback({
      from: userId,
      to: targetUserId || session.interviewee,
      round: session.currentRound,
      role: 'interviewer',
      ratings,
      strengths,
      improvements,
      comments,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/notes', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const session = await MockInterview.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Not found' });
    await session.addNote(userId, req.body.note);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
