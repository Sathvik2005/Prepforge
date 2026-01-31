import express from 'express';
import auth from '../middleware/auth.js';
import SmartRoadmap from '../models/SmartRoadmap.js';
import { generateRoadmap, regenerateRoadmap } from '../services/roadmapGenerator.js';
import { generateRecommendations, recordInteraction, getNextQuestion } from '../services/questionRecommendation.js';
import { 
  analyzeMistake, 
  generateInterviewQuestion, 
  generateInterviewFeedback,
  predictReadiness,
  getStudyCompanionResponse 
} from '../services/aiServices.js';

const router = express.Router();

/**
 * @route   POST /api/ai/roadmap/generate
 * @desc    Generate personalized learning roadmap
 * @access  Private
 */
router.post('/roadmap/generate', auth, async (req, res) => {
  try {
    const { targetRole, targetDate, weeklyHours, experienceLevel, focusAreas, customGoals } = req.body;
    
    // Validation
    if (!targetRole || !targetDate || !weeklyHours || !experienceLevel) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if user already has an active roadmap
    const existingRoadmap = await SmartRoadmap.findOne({
      userId: req.user.id,
      status: 'active'
    });
    
    if (existingRoadmap) {
      return res.status(400).json({
        message: 'You already have an active roadmap. Please complete or pause it first.',
        roadmapId: existingRoadmap._id
      });
    }
    
    // Generate roadmap
    const goals = {
      targetRole,
      targetDate,
      weeklyHours: parseInt(weeklyHours),
      experienceLevel,
      focusAreas: focusAreas || [],
      customGoals: customGoals || ''
    };
    
    const roadmap = await generateRoadmap(req.user.id, goals);
    
    res.status(201).json({
      message: 'Roadmap generated successfully',
      roadmap
    });
    
  } catch (error) {
    console.error('Error generating roadmap:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Server error generating roadmap',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/ai/roadmap/current
 * @desc    Get user's current active roadmap
 * @access  Private
 */
router.get('/roadmap/current', auth, async (req, res) => {
  try {
    const roadmap = await SmartRoadmap.findOne({
      userId: req.user.id,
      status: 'active'
    }).populate('roadmap.dailyPlans.topics.questionIds', 'title difficulty topic');
    
    if (!roadmap) {
      return res.status(404).json({ message: 'No active roadmap found' });
    }
    
    // Calculate real-time progress
    const progress = roadmap.calculateProgress();
    const adherence = roadmap.calculateAdherence();
    
    res.json({
      roadmap,
      metrics: {
        progress,
        adherence
      }
    });
    
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      message: 'Server error fetching roadmap',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/ai/roadmap/today
 * @desc    Get today's daily plan
 * @access  Private
 */
router.get('/roadmap/today', auth, async (req, res) => {
  try {
    const roadmap = await SmartRoadmap.findOne({
      userId: req.user.id,
      status: 'active'
    }).populate('roadmap.dailyPlans.topics.questionIds');
    
    if (!roadmap) {
      return res.status(404).json({ message: 'No active roadmap found' });
    }
    
    const todayPlan = roadmap.getNextDayPlan();
    
    if (!todayPlan) {
      return res.status(404).json({ message: 'No pending tasks. Roadmap completed!' });
    }
    
    res.json({
      dayPlan: todayPlan,
      currentDay: roadmap.adaptiveMetrics.currentDay,
      totalDays: roadmap.roadmap.totalDays
    });
    
  } catch (error) {
    console.error('Error fetching today\'s plan:', error);
    res.status(500).json({ message: 'Server error fetching today\'s plan' });
  }
});

/**
 * @route   PUT /api/ai/roadmap/complete-day/:dayNumber
 * @desc    Mark a day as completed
 * @access  Private
 */
router.put('/roadmap/complete-day/:dayNumber', auth, async (req, res) => {
  try {
    const { dayNumber } = req.params;
    const { actualTimeSpent } = req.body;
    
    const roadmap = await SmartRoadmap.findOne({
      userId: req.user.id,
      status: 'active'
    });
    
    if (!roadmap) {
      return res.status(404).json({ message: 'No active roadmap found' });
    }
    
    // Find and update the day
    const dayPlan = roadmap.roadmap.dailyPlans.find(d => d.day === parseInt(dayNumber));
    
    if (!dayPlan) {
      return res.status(404).json({ message: 'Day not found' });
    }
    
    if (dayPlan.isCompleted) {
      return res.status(400).json({ message: 'Day already completed' });
    }
    
    dayPlan.isCompleted = true;
    dayPlan.completedAt = new Date();
    dayPlan.actualTimeSpent = actualTimeSpent || dayPlan.totalEstimatedTime;
    
    // Update metrics
    roadmap.adaptiveMetrics.currentDay = parseInt(dayNumber) + 1;
    roadmap.adaptiveMetrics.overallProgress = roadmap.calculateProgress();
    roadmap.adaptiveMetrics.adherenceScore = roadmap.calculateAdherence();
    
    await roadmap.save();
    
    // Check if roadmap needs regeneration
    const needsRegen = roadmap.shouldRegenerateRoadmap();
    
    res.json({
      message: 'Day completed successfully',
      progress: roadmap.adaptiveMetrics.overallProgress,
      adherence: roadmap.adaptiveMetrics.adherenceScore,
      needsRegeneration: needsRegen,
      nextDay: roadmap.getNextDayPlan()
    });
    
  } catch (error) {
    console.error('Error completing day:', error);
    res.status(500).json({ message: 'Server error completing day' });
  }
});

/**
 * @route   POST /api/ai/roadmap/regenerate/:roadmapId
 * @desc    Regenerate roadmap based on performance
 * @access  Private
 */
router.post('/roadmap/regenerate/:roadmapId', auth, async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const { reason } = req.body;
    
    const roadmap = await SmartRoadmap.findOne({
      _id: roadmapId,
      userId: req.user.id
    });
    
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }
    
    const newRoadmap = await regenerateRoadmap(roadmapId, reason || 'User requested regeneration');
    
    res.json({
      message: 'Roadmap regenerated successfully',
      roadmap: newRoadmap
    });
    
  } catch (error) {
    console.error('Error regenerating roadmap:', error);
    res.status(500).json({ message: 'Server error regenerating roadmap' });
  }
});

/**
 * @route   PUT /api/ai/roadmap/status/:roadmapId
 * @desc    Update roadmap status (pause/resume/complete/abandon)
 * @access  Private
 */
router.put('/roadmap/status/:roadmapId', auth, async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const { status } = req.body;
    
    if (!['active', 'paused', 'completed', 'abandoned'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const roadmap = await SmartRoadmap.findOneAndUpdate(
      { _id: roadmapId, userId: req.user.id },
      { status },
      { new: true }
    );
    
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }
    
    res.json({
      message: 'Roadmap status updated',
      roadmap
    });
    
  } catch (error) {
    console.error('Error updating roadmap status:', error);
    res.status(500).json({ message: 'Server error updating roadmap status' });
  }
});

/**
 * @route   POST /api/ai/roadmap/feedback/:roadmapId
 * @desc    Submit user feedback on roadmap
 * @access  Private
 */
router.post('/roadmap/feedback/:roadmapId', auth, async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const { rating, comments, adjustmentRequest } = req.body;
    
    const roadmap = await SmartRoadmap.findOne({
      _id: roadmapId,
      userId: req.user.id
    });
    
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }
    
    roadmap.userFeedback.push({
      date: new Date(),
      rating: parseInt(rating),
      comments: comments || '',
      adjustmentRequest: adjustmentRequest || ''
    });
    
    await roadmap.save();
    
    res.json({
      message: 'Feedback submitted successfully',
      feedbackCount: roadmap.userFeedback.length
    });
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ message: 'Server error submitting feedback' });
  }
});

/**
 * @route   GET /api/ai/roadmap/history
 * @desc    Get all user's roadmaps (history)
 * @access  Private
 */
router.get('/roadmap/history', auth, async (req, res) => {
  try {
    const roadmaps = await SmartRoadmap.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select('-roadmap.dailyPlans.topics.questionIds');
    
    res.json({ roadmaps });
    
  } catch (error) {
    console.error('Error fetching roadmap history:', error);
    res.status(500).json({ message: 'Server error fetching roadmap history' });
  }
});

// ==========================================
// ADAPTIVE QUESTION RECOMMENDATION ROUTES
// ==========================================

/**
 * @route   GET /api/ai/questions/next
 * @desc    Get next recommended question (adaptive)
 * @access  Private
 */
router.get('/questions/next', auth, async (req, res) => {
  try {
    const recommendation = await getNextQuestion(req.user.id);
    
    if (!recommendation) {
      return res.status(404).json({ message: 'No recommendations available. Generating...' });
    }
    
    const question = await require('../models/Question').findById(recommendation.questionId);
    
    res.json({
      question,
      recommendationScore: recommendation.score,
      reason: recommendation.reason
    });
    
  } catch (error) {
    console.error('Error fetching next question:', error);
    res.status(500).json({ message: 'Server error fetching next question' });
  }
});

/**
 * @route   GET /api/ai/questions/recommendations
 * @desc    Get multiple recommended questions
 * @access  Private
 */
router.get('/questions/recommendations', auth, async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 10;
    const recommendations = await generateRecommendations(req.user.id, count);
    
    // Populate question details
    const questionIds = recommendations.map(r => r.questionId);
    const questions = await require('../models/Question').find({ _id: { $in: questionIds } });
    
    const enrichedRecommendations = recommendations.map(rec => {
      const question = questions.find(q => q._id.toString() === rec.questionId.toString());
      return {
        question,
        score: rec.score,
        reason: rec.reason
      };
    });
    
    res.json({ recommendations: enrichedRecommendations });
    
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ message: 'Server error fetching recommendations' });
  }
});

/**
 * @route   POST /api/ai/questions/interaction
 * @desc    Record user interaction with a question
 * @access  Private
 */
router.post('/questions/interaction', auth, async (req, res) => {
  try {
    const { questionId, isCorrect, timeSpent, attemptNumber, difficulty, topic, userRating, skipped } = req.body;
    
    await recordInteraction(req.user.id, questionId, {
      isCorrect,
      timeSpent,
      attemptNumber,
      difficulty,
      topic,
      userRating,
      skipped
    });
    
    res.json({ message: 'Interaction recorded successfully' });
    
  } catch (error) {
    console.error('Error recording interaction:', error);
    res.status(500).json({ message: 'Server error recording interaction' });
  }
});

// ==========================================
// MISTAKE PATTERN ANALYSIS ROUTES
// ==========================================

/**
 * @route   POST /api/ai/mistakes/analyze
 * @desc    Analyze a mistake and categorize it
 * @access  Private
 */
router.post('/mistakes/analyze', auth, async (req, res) => {
  try {
    const { questionId, userSolution, isCorrect } = req.body;
    
    const analysis = await analyzeMistake(req.user.id, questionId, userSolution, isCorrect);
    
    res.json({
      message: 'Mistake analyzed successfully',
      analysis
    });
    
  } catch (error) {
    console.error('Error analyzing mistake:', error);
    res.status(500).json({ message: 'Server error analyzing mistake' });
  }
});

/**
 * @route   GET /api/ai/mistakes/patterns
 * @desc    Get user's mistake patterns and insights
 * @access  Private
 */
router.get('/mistakes/patterns', auth, async (req, res) => {
  try {
    const MistakePattern = require('../models/MistakePattern');
    const pattern = await MistakePattern.findOne({ userId: req.user.id });
    
    if (!pattern) {
      return res.status(404).json({ message: 'No mistake data found' });
    }
    
    res.json({
      patterns: pattern.patterns,
      insights: pattern.insights,
      actionPlan: pattern.actionPlan,
      needsIntervention: pattern.needsIntervention()
    });
    
  } catch (error) {
    console.error('Error fetching mistake patterns:', error);
    res.status(500).json({ message: 'Server error fetching mistake patterns' });
  }
});

// ==========================================
// AI QUESTION GENERATION ROUTES
// ==========================================

/**
 * @route   POST /api/ai/questions/generate
 * @desc    Generate AI-powered interview questions
 * @access  Private
 */
router.post('/questions/generate', auth, async (req, res) => {
  try {
    const { role, difficulty, format, topic, count } = req.body;
    
    if (!role || !difficulty || !format || !topic) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const questions = await generateInterviewQuestion({
      role,
      difficulty,
      format,
      topic,
      count: parseInt(count) || 1
    });
    
    res.json({
      message: 'Questions generated successfully',
      questions
    });
    
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ message: 'Server error generating questions' });
  }
});

// ==========================================
// INTERVIEW FEEDBACK ENGINE ROUTES
// ==========================================

/**
 * @route   POST /api/ai/feedback/generate
 * @desc    Generate comprehensive interview feedback
 * @access  Private
 */
router.post('/feedback/generate', auth, async (req, res) => {
  try {
    const { interviewId, codeSolution, transcript, question } = req.body;
    
    const feedback = await generateInterviewFeedback({
      userId: req.user.id,
      interviewId,
      codeSolution,
      transcript,
      question
    });
    
    res.json({
      message: 'Feedback generated successfully',
      feedback
    });
    
  } catch (error) {
    console.error('Error generating feedback:', error);
    res.status(500).json({ message: 'Server error generating feedback' });
  }
});

// ==========================================
// READINESS PREDICTOR ROUTES
// ==========================================

/**
 * @route   GET /api/ai/readiness/:targetRole
 * @desc    Predict interview readiness for a role
 * @access  Private
 */
router.get('/readiness/:targetRole', auth, async (req, res) => {
  try {
    const { targetRole } = req.params;
    
    const readiness = await predictReadiness(req.user.id, targetRole);
    
    res.json({
      message: 'Readiness prediction generated',
      readiness
    });
    
  } catch (error) {
    console.error('Error predicting readiness:', error);
    res.status(500).json({ message: 'Server error predicting readiness' });
  }
});

// ==========================================
// AI STUDY COMPANION ROUTES
// ==========================================

/**
 * @route   POST /api/ai/companion/ask
 * @desc    Ask AI study companion for help
 * @access  Private
 */
router.post('/companion/ask', auth, async (req, res) => {
  try {
    const { query, context } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }
    
    const response = await getStudyCompanionResponse(req.user.id, query, context);
    
    res.json({
      response
    });
    
  } catch (error) {
    console.error('Error getting companion response:', error);
    res.status(500).json({ message: 'Server error getting companion response' });
  }
});

export default router;
