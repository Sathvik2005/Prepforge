import crypto from 'crypto';
import ConversationalInterview from '../models/ConversationalInterview.js';
import InterviewReport from '../models/InterviewReport.js';
import InterviewProgress from '../models/InterviewProgress.js';

/**
 * ReportService
 * Generates and stores a complete InterviewReport from a finished
 * ConversationalInterview session.
 *
 * Design principles:
 *  - Deterministic: same session always produces same report.
 *  - Auditable: all weights, inputs, and intermediate scores are stored.
 *  - Idempotent: calling generate twice returns the existing report.
 */

// Default rubric weights (must sum to 1.0)
const DEFAULT_WEIGHTS = {
  clarity: 0.20,
  relevance: 0.25,
  depth: 0.25,
  structure: 0.15,
  confidence: 0.15,
};

class ReportService {
  // ─── Public API ───────────────────────────────────────────────

  /**
   * Generate (or retrieve cached) report for a session.
   * @param {string} sessionId  - ConversationalInterview _id
   * @param {string} requestingUserId - Must match session.userId
   * @returns {InterviewReport}
   */
  static async generateReport(sessionId, requestingUserId) {
    // 1. Idempotency – return existing report if already generated
    const existing = await InterviewReport.findOne({ sessionId });
    if (existing && existing.status === 'completed') {
      return existing;
    }

    // 2. Load and validate session
    const session = await ConversationalInterview.findById(sessionId);
    if (!session) throw new Error('Interview session not found');

    if (session.userId.toString() !== requestingUserId.toString()) {
      throw new Error('Access denied: session belongs to a different user');
    }

    if (session.status !== 'completed') {
      throw new Error(`Cannot generate report: session status is "${session.status}"`);
    }

    // 3. Create placeholder (prevents duplicate generation on concurrent calls)
    let report = existing || new InterviewReport({
      userId: session.userId,
      sessionId: session._id,
      resumeId: session.resumeId,
      status: 'generating',
    });

    report.status = 'generating';
    await report.save();

    try {
      // 4. Build the full report
      const built = this._buildReport(session);

      // 5. Assign all fields
      Object.assign(report, built);
      report.status = 'completed';
      await report.save();

      // 6. Update longitudinal progress (non-blocking)
      this._updateProgress(session, report).catch(e =>
        console.error('[ReportService] Progress update failed:', e.message)
      );

      return report;
    } catch (err) {
      report.status = 'error';
      report.errorMessage = err.message;
      await report.save();
      throw err;
    }
  }

  /**
   * Get a report by its ID.
   */
  static async getReportById(reportId, requestingUserId) {
    const report = await InterviewReport.findById(reportId);
    if (!report) throw new Error('Report not found');
    if (report.userId.toString() !== requestingUserId.toString()) {
      throw new Error('Access denied');
    }
    return report;
  }

  /**
   * List all reports for a user, newest first.
   */
  static async listReports(userId, { page = 1, limit = 10, role } = {}) {
    const query = { userId, status: 'completed' };
    if (role) query['session.targetRole'] = role;

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      InterviewReport.find(query)
        .select('-turns')            // omit heavy turn data from list view
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InterviewReport.countDocuments(query),
    ]);

    return {
      reports,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete a report.
   */
  static async deleteReport(reportId, requestingUserId) {
    const report = await InterviewReport.findById(reportId);
    if (!report) throw new Error('Report not found');
    if (report.userId.toString() !== requestingUserId.toString()) {
      throw new Error('Access denied');
    }
    await report.deleteOne();
    return true;
  }

  // ─── Internal builders ────────────────────────────────────────

  static _buildReport(session) {
    const weights = DEFAULT_WEIGHTS;

    // Per-turn processing
    const turnReports = this._processTurns(session.turns, weights);

    // Aggregate section scores
    const sectionScores = this._aggregateSections(session.turns, turnReports);

    // All gaps across all turns (deduplicated by skill + type)
    const allGaps = this._collectGaps(turnReports);
    const skillGapSummary = this._buildGapSummary(allGaps);

    // Strengths, weaknesses
    const { strengths, weaknesses, recommendations } = this._deriveInsights(
      session,
      sectionScores,
      allGaps,
      turnReports
    );

    // Readiness score
    const readinessScore = Math.round(sectionScores.overall);
    const readinessLabel = InterviewReport.readinessLabelFromScore(readinessScore);

    // Performance trend (turn-by-turn)
    const performanceTrend = turnReports.map(t => t.turnScore);

    // Provenance hash
    const inputHash = crypto
      .createHash('sha256')
      .update(`${session._id}:${session.completedAt}`)
      .digest('hex');

    return {
      session: {
        interviewType: session.interviewType,
        targetRole: session.targetRole,
        difficulty: session.difficulty,
        totalTurns: session.turns.length,
        durationSeconds: session.duration || 0,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      },
      turns: turnReports,
      sectionScores,
      readinessScore,
      readinessLabel,
      skillGapSummary,
      strengths,
      weaknesses,
      summary: this._generateSummary(readinessScore, sectionScores, session.targetRole),
      recommendations,
      performanceTrend,
      provenance: {
        rubricWeights: weights,
        evaluationVersion: '2.0',
        generatedAt: new Date(),
        inputHash,
      },
    };
  }

  /** Transform raw session turns into per-turn report records */
  static _processTurns(sessionTurns, weights) {
    return sessionTurns
      .filter(t => t.answer && t.answer.text && t.evaluation)
      .map(t => {
        const ev = t.evaluation;
        const rubric = {
          clarity: ev.clarity ?? 0,
          relevance: ev.relevance ?? 0,
          depth: ev.depth ?? 0,
          structure: ev.structure ?? 0,
          confidence: ev.confidence ?? 0,
          technicalAccuracy: ev.technicalAccuracy ?? 0,
        };

        // Recalculate turn score from rubric using stored weights (deterministic)
        const turnScore = Math.round(
          rubric.clarity * weights.clarity +
          rubric.relevance * weights.relevance +
          rubric.depth * weights.depth +
          rubric.structure * weights.structure +
          rubric.confidence * weights.confidence
        );

        // Map stored gaps to report format
        const gaps = (t.evaluation.gaps || []).map(g => ({
          gapType: g.type || g.gapType || 'knowledge-gap',
          skill: g.skill,
          severity: this._mapSeverity(g.severity, turnScore),
          evidence: g.evidence || '',
        }));

        return {
          turnNumber: t.turnNumber,
          questionText: t.question?.text || '',
          questionType: t.question?.type || 'technical',
          topic: t.question?.topic || '',
          answerText: t.answer?.text || '',
          wordCount: t.answer?.wordCount || 0,
          timeSpentSeconds: t.answer?.timeSpent || 0,
          rubric,
          turnScore,
          detectedKeyPoints: ev.detectedKeyPoints || [],
          missedKeyPoints: ev.missedKeyPoints || [],
          feedback: {
            positive: ev.feedback?.positive || [],
            negative: ev.feedback?.negative || [],
            suggestions: ev.feedback?.suggestions || [],
          },
          gaps,
          followUpTriggered: ev.needsFollowUp || false,
          followUpReason: ev.followUpReason || '',
        };
      });
  }

  /** Build aggregate section scores from evaluated turns */
  static _aggregateSections(rawTurns, turnReports) {
    const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

    const technical = turnReports.filter(t => t.questionType === 'technical');
    const behavioral = turnReports.filter(t =>
      ['behavioral', 'situational', 'hr'].includes(t.questionType)
    );
    const all = turnReports;

    const technicalScore = Math.round(avg(technical.map(t => t.turnScore)));
    const behavioralScore = Math.round(avg(behavioral.map(t => t.turnScore)));

    const clarityAvg = Math.round(avg(all.map(t => t.rubric.clarity)));
    const structureAvg = Math.round(avg(all.map(t => t.rubric.structure)));
    const communicationScore = Math.round((clarityAvg + structureAvg) / 2);

    const depthAvg = Math.round(avg(all.map(t => t.rubric.depth)));
    const relevanceAvg = Math.round(avg(all.map(t => t.rubric.relevance)));
    const problemSolvingScore = Math.round((depthAvg + relevanceAvg) / 2);

    // Overall: weighted average of section scores
    const dominant = technical.length > behavioral.length ? 'technical' : 'behavioral';
    let overall;
    if (dominant === 'technical') {
      overall = Math.round(
        technicalScore * 0.40 +
        communicationScore * 0.25 +
        problemSolvingScore * 0.25 +
        (behavioralScore || communicationScore) * 0.10
      );
    } else {
      overall = Math.round(
        behavioralScore * 0.40 +
        communicationScore * 0.30 +
        (technicalScore || problemSolvingScore) * 0.20 +
        problemSolvingScore * 0.10
      );
    }

    return {
      technical: {
        score: technicalScore,
        turnCount: technical.length,
        topicsEvaluated: [...new Set(technical.map(t => t.topic).filter(Boolean))],
      },
      behavioral: {
        score: behavioralScore,
        turnCount: behavioral.length,
        topicsEvaluated: [...new Set(behavioral.map(t => t.topic).filter(Boolean))],
      },
      communication: {
        score: communicationScore,
        clarityAvg,
        structureAvg,
      },
      problemSolving: {
        score: problemSolvingScore,
        depthAvg,
        relevanceAvg,
      },
      overall,
    };
  }

  /** Deduplicate gaps across all turns */
  static _collectGaps(turnReports) {
    const seen = new Set();
    const gaps = [];

    for (const turn of turnReports) {
      for (const gap of turn.gaps) {
        const key = `${gap.gapType}::${gap.skill?.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          gaps.push({ ...gap, fromTurn: turn.turnNumber });
        }
      }
    }

    return gaps;
  }

  /** Build gap summary with severity counts and cluster grouping */
  static _buildGapSummary(gaps) {
    const knowledgeGaps = gaps.filter(g => g.gapType === 'knowledge-gap').map(g => g.skill);
    const explanationGaps = gaps.filter(g => g.gapType === 'explanation-gap').map(g => g.skill);
    const depthGaps = gaps.filter(g => g.gapType === 'depth-gap').map(g => g.skill);

    const critical = gaps.filter(g => g.severity === 'critical').length;
    const major = gaps.filter(g => g.severity === 'major').length;
    const minor = gaps.filter(g => g.severity === 'minor').length;

    // Basic clustering by keyword similarity
    const clusters = this._clusterGaps(gaps);

    return {
      total: gaps.length,
      critical,
      major,
      minor,
      byType: { knowledgeGaps, explanationGaps, depthGaps },
      clusters,
    };
  }

  /** Group related gaps into named learning clusters */
  static _clusterGaps(gaps) {
    // Skill-family map: keywords → cluster name
    const families = [
      { name: 'React Ecosystem', keywords: ['react', 'redux', 'hooks', 'jsx', 'context'] },
      { name: 'JavaScript Core', keywords: ['javascript', 'closure', 'prototype', 'async', 'promise', 'event loop'] },
      { name: 'System Design', keywords: ['scalability', 'load balancing', 'caching', 'database', 'microservices', 'api design'] },
      { name: 'Data Structures & Algorithms', keywords: ['array', 'tree', 'graph', 'dynamic programming', 'sorting', 'complexity'] },
      { name: 'Node.js / Backend', keywords: ['node', 'express', 'middleware', 'rest', 'authentication', 'jwt'] },
      { name: 'Cloud & DevOps', keywords: ['aws', 'docker', 'kubernetes', 'ci/cd', 'deployment', 'azure', 'gcp'] },
      { name: 'Python Core', keywords: ['python', 'decorator', 'generator', 'list comprehension', 'pandas', 'numpy'] },
      { name: 'Behavioral & Communication', keywords: ['articulation', 'explanation', 'communication', 'confidence'] },
    ];

    const clusters = [];
    const assigned = new Set();

    for (const family of families) {
      const matched = gaps.filter(g => {
        const skill = (g.skill || '').toLowerCase();
        return (
          !assigned.has(skill) &&
          family.keywords.some(kw => skill.includes(kw))
        );
      });

      if (matched.length > 0) {
        matched.forEach(g => assigned.add((g.skill || '').toLowerCase()));
        const worstSeverity = matched.some(g => g.severity === 'critical')
          ? 'critical'
          : matched.some(g => g.severity === 'major')
          ? 'major'
          : 'minor';

        clusters.push({
          clusterName: family.name,
          skills: matched.map(g => g.skill),
          severity: worstSeverity,
          suggestedResource: `Review and practice ${family.name} concepts`,
        });
      }
    }

    // Any unassigned gaps go into "Other"
    const unassigned = gaps.filter(g => !assigned.has((g.skill || '').toLowerCase()));
    if (unassigned.length > 0) {
      clusters.push({
        clusterName: 'Other',
        skills: unassigned.map(g => g.skill),
        severity: 'minor',
        suggestedResource: 'Review missing concepts from practice sessions',
      });
    }

    return clusters;
  }

  /** Derive overall strengths, weaknesses, and ordered recommendations */
  static _deriveInsights(session, sectionScores, allGaps, turnReports) {
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];

    const ctx = session.interviewContext || {};
    if (ctx.strongTopics?.length > 0) {
      strengths.push(...ctx.strongTopics.map(t => `Strong understanding of ${t}`));
    }
    if (ctx.strugglingTopics?.length > 0) {
      weaknesses.push(...ctx.strugglingTopics.map(t => `Needs improvement in ${t}`));
    }

    // Section-based insights
    if (sectionScores.technical.score >= 75) {
      strengths.push('Solid technical knowledge demonstrated');
    } else if (sectionScores.technical.score < 55 && sectionScores.technical.turnCount > 0) {
      weaknesses.push('Technical depth needs improvement');
      recommendations.push('Strengthen technical foundations through targeted practice');
    }

    if (sectionScores.communication.score >= 75) {
      strengths.push('Clear and structured communication style');
    } else if (sectionScores.communication.score < 55) {
      weaknesses.push('Clarity and answer structure need improvement');
      recommendations.push('Practice structuring answers: introduce concept → explain → give example → conclude');
    }

    if (sectionScores.problemSolving.score >= 75) {
      strengths.push('Good problem breakdown and depth of explanation');
    } else if (sectionScores.problemSolving.score < 55) {
      weaknesses.push('Answers lack depth and examples');
      recommendations.push('Include specific examples and trade-off discussions in every answer');
    }

    // Confidence-based insight
    const lowConfidenceTurns = turnReports.filter(t => t.rubric.confidence < 60).length;
    if (lowConfidenceTurns > turnReports.length / 2) {
      weaknesses.push('Low confidence detected in many responses');
      recommendations.push('Practice mock interviews to build confidence; reduce hedging words');
    }

    // Gap-based recommendations (most critical first)
    const criticalGaps = allGaps.filter(g => g.severity === 'critical');
    for (const gap of criticalGaps.slice(0, 3)) {
      recommendations.push(`Critical: Study and practice "${gap.skill}"`);
    }

    const majorGaps = allGaps.filter(g => g.severity === 'major');
    for (const gap of majorGaps.slice(0, 3)) {
      recommendations.push(`Improve explanation of "${gap.skill}" with concrete examples`);
    }

    // Deduplicate
    return {
      strengths: [...new Set(strengths)],
      weaknesses: [...new Set(weaknesses)],
      recommendations: [...new Set(recommendations)],
    };
  }

  static _generateSummary(readinessScore, sectionScores, targetRole) {
    const label = InterviewReport.readinessLabelFromScore(readinessScore);
    const role = targetRole || 'the target role';

    const commStr = sectionScores.communication.score >= 70
      ? 'Communication was strong'
      : 'Communication needs refinement';

    const techStr = sectionScores.technical.turnCount > 0
      ? sectionScores.technical.score >= 70
        ? 'Technical knowledge is solid'
        : 'Technical knowledge requires further development'
      : null;

    const parts = [
      `Overall readiness for ${role}: ${label} (${readinessScore}/100).`,
      commStr + '.',
      ...(techStr ? [techStr + '.'] : []),
      sectionScores.problemSolving.score < 60
        ? 'Answers lacked depth and examples — focus on explaining trade-offs and real use-cases.'
        : 'Problem-solving explanations were generally adequate.',
    ];

    return parts.join(' ');
  }

  static _mapSeverity(rawSeverity, turnScore) {
    if (rawSeverity === 'critical' || rawSeverity === 'high') {
      return turnScore < 40 ? 'critical' : 'major';
    }
    if (rawSeverity === 'medium' || rawSeverity === 'major') return 'major';
    return 'minor';
  }

  // ─── Longitudinal progress update ────────────────────────────

  /** Upsert the user's InterviewProgress record with this session's results */
  static async _updateProgress(session, report) {
    let progress = await InterviewProgress.findOne({
      userId: session.userId,
      targetRole: session.targetRole,
    });

    if (!progress) {
      progress = new InterviewProgress({
        userId: session.userId,
        targetRole: session.targetRole,
        sessions: [],
        scoreTrends: { technical: [], behavioral: [], coding: [], overall: [] },
        gapHistory: [],
        topicMastery: [],
      });
    }

    const sessionEntry = {
      sessionId: session._id,
      date: session.completedAt || new Date(),
      type: session.interviewType,
      overallScore: report.sectionScores.overall,
      readinessScore: report.readinessScore,
      duration: Math.round((session.duration || 0) / 60),
    };

    // Avoid duplicate session entries
    const alreadyAdded = progress.sessions.some(
      s => s.sessionId?.toString() === session._id.toString()
    );
    if (!alreadyAdded) {
      progress.sessions.push(sessionEntry);
    }

    // Append score trends
    const trendEntry = { date: new Date(), score: report.sectionScores.overall, sessionId: session._id };
    progress.scoreTrends.overall.push(trendEntry);

    if (report.sectionScores.technical.score > 0) {
      progress.scoreTrends.technical.push({
        date: new Date(),
        score: report.sectionScores.technical.score,
        sessionId: session._id,
      });
    }
    if (report.sectionScores.behavioral.score > 0) {
      progress.scoreTrends.behavioral.push({
        date: new Date(),
        score: report.sectionScores.behavioral.score,
        sessionId: session._id,
      });
    }

    // Append gap history snapshot
    progress.gapHistory.push({
      date: new Date(),
      totalGaps: report.skillGapSummary.total,
      criticalGaps: report.skillGapSummary.critical,
      highGaps: report.skillGapSummary.major,
      mediumGaps: report.skillGapSummary.minor,
      lowGaps: 0,
      closedSinceLastCheck: 0,
      newGapsIdentified: report.skillGapSummary.total,
    });

    await progress.save();
  }
}

export default ReportService;
