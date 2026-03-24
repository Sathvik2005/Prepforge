/**
 * mockInterviewAIService.js
 * AI brain for the mock interview system.
 * Uses createChatCompletion from the shared aiProvider – no changes to other interview systems.
 */
import { createChatCompletion } from './aiProvider.js';

/* ─────────────────────────────────────────────────────────── */
/*  Helpers                                                     */
/* ─────────────────────────────────────────────────────────── */

function safeJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

function difficultyLabel(d) {
  return { easy: 'entry-level', medium: 'mid-level', hard: 'senior-level', system_design: 'principal-level' }[d] || 'mid-level';
}

/* ─────────────────────────────────────────────────────────── */
/*  1. Generate next interview question                        */
/* ─────────────────────────────────────────────────────────── */

/**
 * @param {object} ctx
 * @param {string} ctx.interviewType  'technical'|'behavioral'|'system_design'|'mixed'
 * @param {string} ctx.targetRole
 * @param {string} ctx.difficulty     'easy'|'medium'|'hard'|'system_design'
 * @param {string[]} ctx.askedQuestions  Questions already asked (to avoid duplication)
 * @param {string} [ctx.resumeText]   Brief resume summary
 * @param {string} [ctx.jobDescription]
 * @param {string[]} [ctx.skillGaps]  Known gaps to probe
 * @returns {{ questionText, questionType, difficulty, expectedTopics }}
 */
export async function generateQuestion(ctx) {
  const {
    interviewType = 'technical',
    targetRole = 'Software Engineer',
    difficulty = 'medium',
    askedQuestions = [],
    resumeText = '',
    jobDescription = '',
    skillGaps = [],
  } = ctx;

  const avoidList =
    askedQuestions.length > 0
      ? `\n\nALREADY ASKED – do NOT repeat these:\n${askedQuestions.slice(-8).map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

  const gapContext =
    skillGaps.length > 0
      ? `\n\nKnown skill gaps to probe: ${skillGaps.join(', ')}`
      : '';

  const resumeCtx = resumeText
    ? `\n\nCandidate resume summary:\n${resumeText.slice(0, 400)}`
    : '';

  const jdCtx = jobDescription
    ? `\n\nJob description snippet:\n${jobDescription.slice(0, 400)}`
    : '';

  const prompt = `You are a professional ${difficultyLabel(difficulty)} technical interviewer.

Generate ONE interview question for a ${targetRole} candidate.
Interview type: ${interviewType}
Difficulty: ${difficulty}${resumeCtx}${jdCtx}${gapContext}${avoidList}

Rules:
- Question must be specific enough to reveal depth
- Suitable for a ${difficulty} difficulty ${interviewType} interview
- Return valid JSON ONLY (no markdown):
{
  "questionText": "<full question>",
  "questionType": "<behavioral|technical|system_design|coding>",
  "difficulty": "${difficulty}",
  "expectedTopics": ["<topic1>","<topic2>"]
}`;

  const messages = [
    { role: 'system', content: 'You are an expert technical interviewer. Always respond with valid JSON.' },
    { role: 'user', content: prompt },
  ];

  const result = await createChatCompletion(messages, { max_tokens: 400, temperature: 0.7 });
  const parsed = safeJSON(result.content || result);
  if (parsed) return parsed;

  // Fallback
  return {
    questionText: `Explain a challenging ${interviewType} problem you solved as a ${targetRole}.`,
    questionType: interviewType === 'mixed' ? 'technical' : interviewType,
    difficulty,
    expectedTopics: [interviewType],
  };
}

/* ─────────────────────────────────────────────────────────── */
/*  2. Generate coding problem                                 */
/* ─────────────────────────────────────────────────────────── */

/**
 * @param {object} ctx
 * @param {string} ctx.targetRole
 * @param {string} ctx.difficulty
 * @param {string[]} ctx.topics
 * @returns {{ title, description, examples, constraints, hints, starterCode, solutionOutline }}
 */
export async function generateCodingProblem(ctx) {
  const { targetRole = 'Software Engineer', difficulty = 'medium', topics = [] } = ctx;

  const topicStr = topics.length > 0 ? topics.join(', ') : 'arrays, strings, hashmaps';

  const prompt = `Create a coding interview problem for a ${difficultyLabel(difficulty)} ${targetRole}.
Topics to focus on: ${topicStr}
Difficulty: ${difficulty}

Return valid JSON ONLY:
{
  "title": "<problem title>",
  "description": "<full problem statement with input/output spec>",
  "examples": [{"input": "<str>", "output": "<str>", "explanation": "<str>"}],
  "constraints": ["<constraint1>","<constraint2>"],
  "hints": ["<hint1 no solution spoiler>"],
  "starterCode": "function solution(input) {\\n  // your code here\\n}",
  "solutionOutline": "<brief algorithmic approach – no full code>"
}`;

  const messages = [
    { role: 'system', content: 'You are an expert algorithm interviewer. Return valid JSON only.' },
    { role: 'user', content: prompt },
  ];

  const result = await createChatCompletion(messages, { max_tokens: 800, temperature: 0.6 });
  const parsed = safeJSON(result.content || result);
  if (parsed) return parsed;

  // Fallback problem
  return {
    title: 'Two Sum',
    description:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    examples: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: '2 + 7 = 9' }],
    constraints: ['2 ≤ nums.length ≤ 10⁴', '-10⁹ ≤ nums[i] ≤ 10⁹'],
    hints: ['Consider using a hash map for O(n) time'],
    starterCode: 'function twoSum(nums, target) {\n  // your code here\n}',
    solutionOutline: 'Use a hashmap to store complement lookups',
  };
}

/* ─────────────────────────────────────────────────────────── */
/*  3. Evaluate answer                                         */
/* ─────────────────────────────────────────────────────────── */

/**
 * @param {object} ctx
 * @param {string} ctx.questionText
 * @param {string} ctx.questionType
 * @param {string} ctx.answerText  (transcript or typed)
 * @param {string[]} ctx.expectedTopics
 * @returns evaluation object with per-dimension scores (0-10) + overall + feedback
 */
// Dimension weights must sum to 1.0
const DIM_WEIGHTS = {
  technicalAccuracy: 0.30,
  depth:             0.25,
  clarity:           0.20,
  relevance:         0.15,
  structure:         0.10,
};

/**
 * Compute a deterministic weighted overallScore (0-100) from dimension scores (0-10).
 * Never trusts the AI-reported overallScore.
 */
function computeOverall(dims) {
  let weighted = 0;
  for (const [key, weight] of Object.entries(DIM_WEIGHTS)) {
    weighted += (dims[key]?.score ?? 0) * weight;
  }
  return Math.round(weighted * 10); // 0-10 → 0-100
}

export async function evaluateAnswer(ctx) {
  const {
    questionText,
    questionType = 'technical',
    answerText,
    expectedTopics = [],
  } = ctx;

  if (!answerText || answerText.trim().length < 5) {
    return buildZeroEvaluation('No answer provided.');
  }

  const prompt = `You are an expert ${questionType} interviewer evaluating a candidate's answer.

Question: "${questionText}"
Candidate's Answer: "${answerText.slice(0, 1200)}"
Expected topics: ${expectedTopics.join(', ') || 'N/A'}

Evaluate the answer on these 5 dimensions. Score each 0-10 (10 = perfect). Be honest and calibrated:
- 0-3: Major gaps or incorrect
- 4-5: Partial understanding, significant missing elements  
- 6-7: Solid understanding with minor gaps
- 8-9: Strong answer with good depth
- 10: Exceptional, covers all aspects thoroughly

1. clarity        — How clear and well-articulated is the response?
2. technicalAccuracy — How technically correct and precise is the answer?
3. depth          — How deep, detailed, and thorough is the explanation?
4. structure      — Is the answer well-organized, with logical flow?
5. relevance      — How directly does the answer address the question?

Return valid JSON ONLY (no markdown, no extra keys):
{
  "clarity":           {"score": <0-10>, "comment": "<1-sentence>"},
  "technicalAccuracy": {"score": <0-10>, "comment": "<1-sentence>"},
  "depth":             {"score": <0-10>, "comment": "<1-sentence>"},
  "structure":         {"score": <0-10>, "comment": "<1-sentence>"},
  "relevance":         {"score": <0-10>, "comment": "<1-sentence>"},
  "feedback": "<2-3 sentence constructive feedback mentioning what was good and what to improve>",
  "suggestedFollowUp": "<one targeted follow-up question>"
}`;

  const messages = [
    { role: 'system', content: 'You are a strict but fair technical interviewer. Return valid JSON only.' },
    { role: 'user', content: prompt },
  ];

  const result = await createChatCompletion(messages, { max_tokens: 600, temperature: 0.3 });
  const parsed = safeJSON(result.content || result);
  if (parsed) {
    // Always compute overallScore deterministically — never use AI-reported value
    parsed.overallScore = computeOverall(parsed);
    return parsed;
  }

  // Fallback – mid-range scores
  return buildZeroEvaluation('Unable to evaluate at this time.', 5);
}

function buildZeroEvaluation(feedback = '', dimScore = 0) {
  const dim = { score: dimScore, comment: feedback };
  const dims = { clarity: dim, technicalAccuracy: dim, depth: dim, structure: dim, relevance: dim };
  return {
    ...dims,
    overallScore: computeOverall(dims), // 0-100
    feedback,
    suggestedFollowUp: null,
  };
}

/* ─────────────────────────────────────────────────────────── */
/*  4. Generate follow-up question                            */
/* ─────────────────────────────────────────────────────────── */

/**
 * @param {string} question
 * @param {string} answer
 * @param {object} evaluation
 * @returns string (the follow-up question)
 */
export async function generateFollowUp(question, answer, evaluation) {
  if (evaluation?.suggestedFollowUp) return evaluation.suggestedFollowUp;

  const weakestDim = findWeakestDimension(evaluation);

  const prompt = `As an interviewer, generate ONE targeted follow-up question.

Original question: "${question}"
Candidate's answer: "${answer?.slice(0, 600)}"
Weakest area: ${weakestDim}

The follow-up should probe the weakest area deeper.
Return only the follow-up question text (plain string, no JSON, no quotes).`;

  const messages = [
    { role: 'system', content: 'You are a skilled technical interviewer.' },
    { role: 'user', content: prompt },
  ];

  const result = await createChatCompletion(messages, { max_tokens: 150, temperature: 0.5 });
  return (result.content || result || '').trim();
}

function findWeakestDimension(evaluation) {
  if (!evaluation) return 'depth';
  const dims = ['clarity', 'technicalAccuracy', 'depth', 'structure', 'relevance'];
  let weakest = dims[0], minScore = Infinity;
  for (const d of dims) {
    const s = evaluation[d]?.score ?? 10;
    if (s < minScore) { minScore = s; weakest = d; }
  }
  return weakest;
}

/* ─────────────────────────────────────────────────────────── */
/*  5. Adapt difficulty                                        */
/* ─────────────────────────────────────────────────────────── */

/**
 * Returns the next difficulty based on rolling average score.
 * @param {number[]} recentScores  Last 3 overall scores (0-10)
 * @param {string} currentDifficulty
 * @returns string next difficulty
 */
export function adaptDifficulty(recentScores, currentDifficulty = 'medium') {
  if (!recentScores || recentScores.length === 0) return currentDifficulty;

  // recentScores are 0-100 (computed overallScore)
  const avg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

  const ladder = ['easy', 'medium', 'hard', 'system_design'];
  const idx = ladder.indexOf(currentDifficulty);

  if (avg >= 78 && idx < ladder.length - 1) return ladder[idx + 1]; // performing well → harder
  if (avg <= 45 && idx > 0) return ladder[idx - 1];                 // struggling → easier
  return currentDifficulty;
}

/* ─────────────────────────────────────────────────────────── */
/*  6. Generate complete session report                        */
/* ─────────────────────────────────────────────────────────── */

/**
 * @param {object} session  MockInterview document (lean)
 * @param {object[]} turns  Array of evaluated question-answer turns
 * @param {object[]} codingProblems
 * @param {number} durationSeconds
 * @returns full report data object (to save in MockInterviewReport)
 */
export async function generateSessionReport(session, turns, codingProblems = [], durationSeconds = 0) {
  /* ── Aggregate scores ──────────────────────────────────────── */
  const dims = ['clarity', 'technicalAccuracy', 'depth', 'structure', 'relevance'];
  const sectionTotals = Object.fromEntries(dims.map((d) => [d, 0]));
  let validAnswers = 0;

  for (const turn of turns) {
    if (!turn.evaluation) continue;
    validAnswers++;
    for (const d of dims) {
      sectionTotals[d] += turn.evaluation[d]?.score ?? 0;
    }
  }

  // sectionScores: 0-100 scale (raw 0-10 dimension avg × 10)
  const sectionScores = Object.fromEntries(
    dims.map((d) => [d, validAnswers > 0 ? Math.round((sectionTotals[d] / validAnswers) * 10) : 0])
  );
  // overallScore: weighted 0-100 using same weights as per-question eval
  const overallScore = validAnswers > 0
    ? Math.round(
        Object.entries(DIM_WEIGHTS).reduce((sum, [d, w]) => sum + (sectionScores[d] ?? 0) * w, 0)
      )
    : 0;

  /* ── Readiness label ─────────────────────────────────────── */
  const readinessLabel =
    overallScore >= 80 ? 'excellent'
    : overallScore >= 62 ? 'interview-ready'
    : overallScore >= 42 ? 'needs-improvement'
    : 'beginner';

  /* ── Narrative from AI ───────────────────────────────────── */
  const turnSummary = turns
    .map((t, i) => `Q${i + 1}: "${t.questionText}" → score ${t.evaluation?.overallScore ?? 'N/A'}/100`)
    .join('\n');

  const prompt = `You are a senior technical interviewer writing a post-interview report.

Session summary:
${turnSummary}

Overall score: ${overallScore}/100
Section scores: ${JSON.stringify(sectionScores)}

Write a structured report. Return valid JSON ONLY:
{
  "strengths": ["<strength1>","<strength2>","<strength3>"],
  "improvements": ["<improvement1>","<improvement2>","<improvement3>"],
  "skillGaps": [
    {"skill":"<skill>","gapType":"knowledge|explanation|depth|practice","severity":"low|medium|high","suggestion":"<1-sentence>"}
  ]
}`;

  const messages = [
    { role: 'system', content: 'You are an expert interview coach writing actionable feedback. Return valid JSON only.' },
    { role: 'user', content: prompt },
  ];

  let narrative = { strengths: [], improvements: [], skillGaps: [] };
  try {
    const result = await createChatCompletion(messages, { max_tokens: 600, temperature: 0.4 });
    const parsed = safeJSON(result.content || result);
    if (parsed) narrative = parsed;
  } catch {
    // use defaults
  }

  /* ── Difficulty arc ──────────────────────────────────────── */
  const difficultyProgression = turns.map((t, i) => ({
    questionIndex: i,
    difficulty: t.difficulty || 'medium',
    score: t.evaluation?.overallScore ?? 0,
  }));

  return {
    mockInterviewId: session._id,
    userId: session.interviewee,
    interviewType: session.type || 'technical',
    targetRole: session.topics?.[0] || 'Software Engineer',
    durationSeconds,
    questionsAsked: turns.length,
    answersSubmitted: turns.filter((t) => t.answerText || t.transcript).length,
    codingProblemsSolved: codingProblems.filter((p) => p.passed).length,
    turns,
    codingProblems,
    sectionScores,
    overallScore,
    readinessLabel,
    difficultyProgression,
    ...narrative,
  };
}
