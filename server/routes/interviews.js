import express from 'express';
import Interview from '../models/Interview.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/interviews
// @desc    Get all interviews for user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.user.id })
      .populate('interviewerId', 'name email')
      .sort({ scheduledAt: -1 });
    
    res.json(interviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/interviews/schedule
// @desc    Schedule a new interview
// @access  Private
router.post('/schedule', auth, async (req, res) => {
  try {
    const { type, mode, interviewerId, scheduledAt, duration, questions } = req.body;

    // Generate meeting link for live interviews
    let meetingLink = null;
    let roomId = null;
    
    if (mode === 'live') {
      roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      meetingLink = `https://meet.prepforge.com/${roomId}`;
    }

    const interview = new Interview({
      userId: req.user.id,
      type,
      mode,
      interviewerId: mode === 'live' ? interviewerId : undefined,
      scheduledAt,
      duration,
      meetingLink,
      roomId,
      questions: questions || [],
      status: 'scheduled',
    });

    await interview.save();

    // TODO: Send email confirmation
    // TODO: Schedule reminders (24h and 1h before)

    res.json(interview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/interviews/:id
// @desc    Get interview details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('interviewerId', 'name email avatar');

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Check ownership
    if (interview.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(interview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/interviews/:id/status
// @desc    Update interview status
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    interview.status = status;
    
    if (status === 'completed') {
      interview.completedAt = new Date();
    }

    await interview.save();

    res.json(interview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/interviews/:id/recording
// @desc    Upload video recording for async interview
// @access  Private
router.post('/:id/recording', auth, async (req, res) => {
  try {
    const { questionId, storageUrl, duration, transcription } = req.body;

    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Simulate AI analysis
    const aiAnalysis = {
      clarity: Math.floor(Math.random() * 30) + 70, // 70-100
      confidence: Math.floor(Math.random() * 30) + 65,
      technicalAccuracy: Math.floor(Math.random() * 30) + 70,
      communication: Math.floor(Math.random() * 30) + 75,
      overallScore: 0,
      strengths: ['Clear communication', 'Good examples'],
      improvements: ['More detail on edge cases', 'Improve time management'],
    };

    aiAnalysis.overallScore = Math.round(
      (aiAnalysis.clarity + aiAnalysis.confidence + 
       aiAnalysis.technicalAccuracy + aiAnalysis.communication) / 4
    );

    interview.videoRecordings.push({
      questionId,
      storageUrl,
      duration,
      uploadedAt: new Date(),
      transcription,
      aiAnalysis,
    });

    // Mark question as answered
    const question = interview.questions.find(q => q._id.toString() === questionId);
    if (question) {
      question.answered = true;
    }

    await interview.save();

    res.json(interview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/interviews/:id/rubric
// @desc    Update rubric scores (interviewer evaluation)
// @access  Private
router.put('/:id/rubric', auth, async (req, res) => {
  try {
    const { rubricScores, overallFeedback, readinessScore } = req.body;

    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    interview.rubricScores = rubricScores;
    interview.overallFeedback = overallFeedback;
    interview.readinessScore = readinessScore;

    await interview.save();

    res.json(interview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/interviews/:id
// @desc    Cancel interview
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    interview.status = 'cancelled';
    await interview.save();

    res.json({ message: 'Interview cancelled' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
