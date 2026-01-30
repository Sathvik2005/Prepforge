import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import Question from '../models/Question.js';

const router = express.Router();

// Get all questions with filters
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { topic, difficulty, type } = req.query;
    const filter = {};

    if (topic) filter.topic = topic;
    if (difficulty) filter.difficulty = difficulty;
    if (type) filter.type = type;

    const questions = await Question.find(filter);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch questions', error: error.message });
  }
});

// Get single question
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch question', error: error.message });
  }
});

// Get random question (adaptive)
router.get('/random/:difficulty', authMiddleware, async (req, res) => {
  try {
    const { difficulty } = req.params;
    const count = await Question.countDocuments({ difficulty });
    const random = Math.floor(Math.random() * count);
    const question = await Question.findOne({ difficulty }).skip(random);

    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch random question', error: error.message });
  }
});

export default router;
