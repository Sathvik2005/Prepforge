import express from 'express';
import Interview from '../models/Interview.js';
import auth from '../middleware/auth.js';
import { createChatCompletion } from '../services/groqService.js';

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

// @route   GET /api/interviews/:id/questions
// @desc    Generate or retrieve AI questions for an interview
// @access  Private
router.get('/:id/questions', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    if (interview.userId.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    // Return cached questions if already generated
    if (interview.questions && interview.questions.length > 0) {
      return res.json({ questions: interview.questions });
    }

    // Build type-specific focus
    const focusMap = {
      frontend: 'React, JavaScript, CSS, HTML, browser APIs, performance, accessibility',
      backend: 'Node.js, databases, REST/GraphQL APIs, microservices, security, scalability',
      dsa: 'arrays, linked lists, trees, graphs, dynamic programming, sorting, time/space complexity',
      'system-design': 'distributed systems, load balancing, caching, databases, consistency, scalability',
      behavioral: 'teamwork, leadership, conflict resolution, problem-solving, communication, STAR method',
    };
    const focus = focusMap[interview.type] || 'general software engineering';

    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'You are a senior technical interviewer. Respond only with valid JSON, no explanation.',
      },
      {
        role: 'user',
        content: `Generate 8 interview questions for a ${interview.type} interview. Focus: ${focus}.
Return ONLY a JSON array of 8 objects:
[{"id":1,"questionText":"...","questionType":"technical","timeLimit":120},...]
questionType must be one of: behavioral, technical, system-design, coding
timeLimit in seconds (90-180). Mix of easy/medium/hard.`,
      },
    ], { temperature: 0.7, max_tokens: 2000 });

    const jsonMatch = response.content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) throw new Error('AI returned invalid format');

    const parsed = JSON.parse(jsonMatch[0]);
    interview.questions = parsed.map((q) => ({
      questionText: q.questionText,
      questionType: q.questionType || 'technical',
      timeLimit: q.timeLimit || 120,
      answered: false,
    }));
    await interview.save();

    res.json({ questions: interview.questions });
  } catch (error) {
    console.error('Questions generation error:', error);
    res.status(500).json({ message: 'Failed to generate questions', error: error.message });
  }
});

// @route   POST /api/interviews/:id/evaluate
// @desc    Evaluate interview answers and save AI report
// @access  Private
router.post('/:id/evaluate', auth, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers)) return res.status(400).json({ message: 'answers array required' });

    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    if (interview.userId.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const answeredCount = answers.filter((a) => !a.skipped && a.answer?.trim()).length;

    let evaluation;
    if (answeredCount === 0) {
      evaluation = {
        overallScore: 0,
        overallFeedback: 'No questions were answered during this session.',
        perQuestion: answers.map(() => ({
          score: 0,
          feedback: 'Skipped',
          strengths: [],
          improvements: ['Practice answering this type of question'],
        })),
        strengths: [],
        improvements: ['Attempt to answer questions to receive a score and feedback'],
        readinessScore: 0,
        explanation: 'Score is 0 because no answers were submitted.',
      };
    } else {
      const qa = answers
        .map((a, i) => `Q${i + 1}: ${a.question}\nAnswer: ${a.skipped ? '[SKIPPED]' : (a.answer?.trim() || '[empty]')}`)
        .join('\n\n');

      const response = await createChatCompletion([
        {
          role: 'system',
          content: `You are an expert ${interview.type} interviewer. Evaluate answers and respond ONLY with valid JSON.`,
        },
        {
          role: 'user',
          content: `Evaluate these ${interview.type} interview answers:\n\n${qa}\n\nReturn ONLY JSON:
{"overallScore":<0-100>,"overallFeedback":"<2-3 sentences>","perQuestion":[{"score":<0-10>,"feedback":"<specific>","strengths":["..."],"improvements":["..."]}],"strengths":["..."],"improvements":["..."],"readinessScore":<0-100>,"explanation":"<why this score>"}
perQuestion array must have exactly ${answers.length} items matching each question in order.`,
        },
      ], { temperature: 0.4, max_tokens: 3000 });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI returned invalid evaluation format');
      evaluation = JSON.parse(jsonMatch[0]);

      // Ensure perQuestion array matches answers length
      if (!Array.isArray(evaluation.perQuestion) || evaluation.perQuestion.length !== answers.length) {
        evaluation.perQuestion = answers.map((a) =>
          a.skipped
            ? { score: 0, feedback: 'Skipped', strengths: [], improvements: ['Attempt this question next time'] }
            : { score: Math.round((evaluation.overallScore || 50) / 10), feedback: 'Evaluated as part of overall assessment', strengths: [], improvements: [] }
        );
      }
    }

    // Persist report on interview document
    interview.status = 'completed';
    interview.completedAt = new Date();
    interview.overallFeedback = evaluation.overallFeedback;
    interview.readinessScore = evaluation.readinessScore ?? evaluation.overallScore;
    interview.aiReport = evaluation;
    await interview.save();

    res.json(evaluation);
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({ message: 'Failed to evaluate answers', error: error.message });
  }
});

export default router;
