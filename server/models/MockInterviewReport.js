/**
 * MockInterviewReport - persisted report document for AI mock interview sessions.
 * Separate from InterviewReport (live sessions) to keep schemas independent.
 */
import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

const scoreDimensionSchema = new Schema(
  {
    score: { type: Number, min: 0, max: 10, default: 0 },
    label: String,
    comment: String,
  },
  { _id: false }
);

const questionAnswerSchema = new Schema(
  {
    questionId: String,
    questionText: String,
    questionType: {
      type: String,
      enum: ['behavioral', 'technical', 'system_design', 'coding', 'followup'],
      default: 'technical',
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'system_design'],
      default: 'medium',
    },
    answerText: String,
    transcript: String,
    videoUrl: String,
    durationSeconds: Number,
    evaluation: {
      clarity: scoreDimensionSchema,
      technicalAccuracy: scoreDimensionSchema,
      depth: scoreDimensionSchema,
      structure: scoreDimensionSchema,
      relevance: scoreDimensionSchema,
      overallScore: { type: Number, min: 0, max: 10, default: 0 },
      feedback: String,
    },
    followUpQuestions: [String],
    askedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const codingProblemSchema = new Schema(
  {
    problemId: String,
    title: String,
    description: String,
    difficulty: String,
    userCode: String,
    language: { type: String, default: 'javascript' },
    executionResult: Schema.Types.Mixed,
    timeTaken: Number,
    passed: { type: Boolean, default: false },
    aiReview: String,
  },
  { _id: false }
);

const skillGapSchema = new Schema(
  {
    skill: String,
    gapType: { type: String, enum: ['knowledge', 'explanation', 'depth', 'practice'], default: 'knowledge' },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    suggestion: String,
  },
  { _id: false }
);

const mockInterviewReportSchema = new Schema(
  {
    /* ── References ─────────────────────────── */
    mockInterviewId: { type: Types.ObjectId, ref: 'MockInterview', required: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    // Optional: a recruiter / peer who joined
    recruiterId: { type: Types.ObjectId, ref: 'User' },

    /* ── Session metadata ─────────────────────── */
    interviewType: {
      type: String,
      enum: ['technical', 'behavioral', 'system_design', 'mixed'],
      default: 'technical',
    },
    targetRole: String,
    durationSeconds: { type: Number, default: 0 },
    questionsAsked: { type: Number, default: 0 },
    answersSubmitted: { type: Number, default: 0 },
    codingProblemsSolved: { type: Number, default: 0 },

    /* ── Q&A log ──────────────────────────────── */
    turns: [questionAnswerSchema],
    codingProblems: [codingProblemSchema],

    /* ── Aggregate scores (0–100) ─────────────── */
    sectionScores: {
      clarity: { type: Number, default: 0 },
      technicalAccuracy: { type: Number, default: 0 },
      depth: { type: Number, default: 0 },
      structure: { type: Number, default: 0 },
      relevance: { type: Number, default: 0 },
    },
    overallScore: { type: Number, default: 0 },
    readinessLabel: {
      type: String,
      enum: ['excellent', 'interview-ready', 'needs-improvement', 'beginner'],
      default: 'needs-improvement',
    },

    /* ── Narrative ───────────────────────────── */
    strengths: [String],
    improvements: [String],
    skillGaps: [skillGapSchema],
    recruiterFeedback: Schema.Types.Mixed,

    /* ── Difficulty arc ──────────────────────── */
    difficultyProgression: [
      {
        questionIndex: Number,
        difficulty: String,
        score: Number,
      },
    ],
  },
  { timestamps: true }
);

mockInterviewReportSchema.index({ userId: 1, createdAt: -1 });
mockInterviewReportSchema.index({ mockInterviewId: 1 }, { unique: true, sparse: true });

const MockInterviewReport = mongoose.model('MockInterviewReport', mockInterviewReportSchema);
export default MockInterviewReport;
