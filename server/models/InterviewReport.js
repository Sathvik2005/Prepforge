import mongoose from 'mongoose';

/**
 * InterviewReport Model
 * Stores the complete, finalized report for a completed interview session.
 * Generated from ConversationalInterview once status === 'completed'.
 *
 * Covers:
 *  - Per-turn rubric subscores (clarity, relevance, depth, structure, confidence)
 *  - Aggregate section scores (technical, behavioral, communication, problem-solving)
 *  - Skill-gap classification (knowledge-gap / explanation-gap / depth-gap)
 *  - Interview readiness indicator (0-100)
 *  - Recommendations and learning roadmap seeds
 *  - Provenance: which inputs/weights produced which score (for auditability)
 */
const interviewReportSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ConversationalInterview',
      required: true,
      unique: true, // one report per session — unique already creates an index
    },

    // Optional context links
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParsedResume',
    },
    jobDescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobDescription',
    },

    // ── Session metadata snapshot ─────────────────────────────────
    session: {
      interviewType: String,       // 'technical' | 'behavioral' | 'hr' | 'coding' | 'mixed'
      targetRole: String,
      difficulty: String,
      totalTurns: Number,
      durationSeconds: Number,
      startedAt: Date,
      completedAt: Date,
    },

    // ── Per-turn breakdown ────────────────────────────────────────
    turns: [
      {
        turnNumber: Number,
        questionText: String,
        questionType: String,   // 'technical' | 'behavioral' | 'situational' | 'follow-up'
        topic: String,

        answerText: String,
        wordCount: Number,
        timeSpentSeconds: Number,

        // Rubric subscores (0-100 each)
        rubric: {
          clarity: Number,
          relevance: Number,
          depth: Number,
          structure: Number,
          confidence: Number,
          technicalAccuracy: Number,  // optional; 0 if not applicable
        },

        // Weighted final score for this turn (0-100)
        turnScore: Number,

        // Explainability: what drove the score
        detectedKeyPoints: [String],
        missedKeyPoints: [String],
        feedback: {
          positive: [String],
          negative: [String],
          suggestions: [String],
        },

        gaps: [
          {
            gapType: {
              type: String,
              enum: ['knowledge-gap', 'explanation-gap', 'depth-gap'],
            },
            skill: String,
            severity: {
              type: String,
              enum: ['critical', 'major', 'minor'],
            },
            evidence: String,
          },
        ],

        // Was a follow-up asked?
        followUpTriggered: Boolean,
        followUpReason: String,
      },
    ],

    // ── Aggregate section scores (0-100) ─────────────────────────
    sectionScores: {
      technical: {
        score: Number,
        turnCount: Number,
        topicsEvaluated: [String],
      },
      behavioral: {
        score: Number,
        turnCount: Number,
        topicsEvaluated: [String],
      },
      communication: {
        // Derived: avg(clarity + structure) across all turns
        score: Number,
        clarityAvg: Number,
        structureAvg: Number,
      },
      problemSolving: {
        // Derived: avg(depth + relevance) across all turns
        score: Number,
        depthAvg: Number,
        relevanceAvg: Number,
      },
      overall: Number,   // Weighted aggregate of all sections
    },

    // ── Interview readiness indicator (0-100) ────────────────────
    readinessScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    readinessLabel: {
      type: String,
      enum: ['Needs Work', 'Developing', 'Competent', 'Strong', 'Excellent'],
    },

    // ── Skill gap summary ────────────────────────────────────────
    skillGapSummary: {
      total: Number,
      critical: Number,
      major: Number,
      minor: Number,
      byType: {
        knowledgeGaps: [String],    // skill names
        explanationGaps: [String],
        depthGaps: [String],
      },
      // Clusters: related gaps grouped into learning units
      clusters: [
        {
          clusterName: String,       // e.g. 'React Ecosystem'
          skills: [String],
          severity: String,
          suggestedResource: String,
        },
      ],
    },

    // ── Strengths & weaknesses ───────────────────────────────────
    strengths: [String],
    weaknesses: [String],

    summary: String,   // Human-readable paragraph summary

    recommendations: [String],   // Ordered, actionable improvements

    // ── Performance trend within this session ────────────────────
    performanceTrend: [Number],   // turn-by-turn overallScores

    // ── Provenance / auditability ────────────────────────────────
    provenance: {
      rubricWeights: {
        clarity: Number,       // default 0.20
        relevance: Number,     // default 0.25
        depth: Number,         // default 0.25
        structure: Number,     // default 0.15
        confidence: Number,    // default 0.15
      },
      evaluationVersion: {
        type: String,
        default: '2.0',
      },
      generatedAt: {
        type: Date,
        default: Date.now,
      },
      inputHash: String,   // SHA-256 of sessionId + completedAt for reproducibility check
    },

    // ── Status ───────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['generating', 'completed', 'error'],
      default: 'generating',
    },

    errorMessage: String,
  },
  {
    timestamps: true,   // createdAt + updatedAt
  }
);

// Indexes
interviewReportSchema.index({ userId: 1, createdAt: -1 });
// sessionId unique index is defined via `unique: true` on the field itself — no duplicate needed
interviewReportSchema.index({ 'session.targetRole': 1 });
interviewReportSchema.index({ readinessScore: -1 });

// Virtual: score-based grade
interviewReportSchema.virtual('grade').get(function () {
  const s = this.readinessScore;
  if (s >= 90) return 'A';
  if (s >= 75) return 'B';
  if (s >= 60) return 'C';
  if (s >= 45) return 'D';
  return 'F';
});

// Static: resolve readiness label from score
interviewReportSchema.statics.readinessLabelFromScore = function (score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 55) return 'Competent';
  if (score >= 40) return 'Developing';
  return 'Needs Work';
};

export default mongoose.model('InterviewReport', interviewReportSchema);
