import express from 'express';
import auth from '../middleware/auth.js';
import { executeCode } from '../services/codeExecutor.js';
import { generateTrace } from '../services/traceEngine.js';
import { analyzeComplexity } from '../services/complexityAnalyzer.js';
import { explainCode } from '../services/aiCodeExplainer.js';

const router = express.Router();

/**
 * @route   POST /api/code-execution/execute
 * @desc    Execute code in secure sandbox
 * @access  Private
 */
router.post('/execute', auth, async (req, res) => {
  try {
    const { code, language, input } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    if (!['python', 'java', 'javascript'].includes(language)) {
      return res.status(400).json({ message: 'Unsupported language. Supported: python, java, javascript' });
    }

    const result = await executeCode(code, language, input);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Code execution error:', error);
    res.status(500).json({
      success: false,
      message: 'Execution failed',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/code-execution/trace
 * @desc    Generate step-by-step execution trace
 * @access  Private
 */
router.post('/trace', auth, async (req, res) => {
  try {
    const { code, language, input } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    const trace = await generateTrace(code, language, input);

    res.json({
      success: true,
      trace,
    });
  } catch (error) {
    console.error('Trace generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Trace generation failed',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/code-execution/analyze
 * @desc    Analyze code complexity and patterns
 * @access  Private
 */
router.post('/analyze', auth, async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    const analysis = await analyzeComplexity(code, language);

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Complexity analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Analysis failed',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/code-execution/explain
 * @desc    Generate AI explanation of code
 * @access  Private
 */
router.post('/explain', auth, async (req, res) => {
  try {
    const { code, language, mode } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    const validModes = ['beginner', 'interview', 'competitive'];
    const explanationMode = validModes.includes(mode) ? mode : 'beginner';

    const explanation = await explainCode(code, language, explanationMode);

    res.json({
      success: true,
      explanation,
    });
  } catch (error) {
    console.error('Code explanation error:', error);
    res.status(500).json({
      success: false,
      message: 'Explanation failed',
      error: error.message,
    });
  }
});

export default router;
