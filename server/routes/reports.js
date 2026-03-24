/**
 * INTERVIEW REPORTS API
 *
 * POST /api/reports/generate/:sessionId  - Generate & store a report for a completed session
 * GET  /api/reports/:reportId            - Get a single report (full detail)
 * GET  /api/reports                      - List reports for logged-in user (paginated)
 * DELETE /api/reports/:reportId          - Delete a report
 * GET  /api/reports/:reportId/summary    - Get lightweight summary (for cards/list preview)
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import ReportService from '../services/reportService.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/reports/generate/:sessionId
 * @desc    Generate and store a full report for a completed interview session.
 *          Idempotent – returns existing report if already generated.
 * @access  Private
 */
router.post('/generate/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const report = await ReportService.generateReport(sessionId, userId);

    return res.status(201).json({
      success: true,
      message: 'Report generated successfully',
      data: report,
    });
  } catch (error) {
    console.error('[POST /reports/generate] Error:', error.message);

    if (error.message.includes('Access denied')) {
      return res.status(403).json({ success: false, error: error.message });
    }
    if (error.message.includes('session not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message.includes('status is')) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/reports
 * @desc    List all reports for the authenticated user (newest first).
 *          Supports pagination and optional role filter.
 * @query   page, limit, role
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const role = req.query.role || undefined;

    const result = await ReportService.listReports(userId, { page, limit, role });

    return res.json({
      success: true,
      data: result.reports,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[GET /reports] Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/reports/:reportId
 * @desc    Get full report (all turns, rubric breakdown, gaps, recommendations).
 * @access  Private
 */
router.get('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.userId || req.user?.id;

    const report = await ReportService.getReportById(reportId, userId);

    return res.json({ success: true, data: report });
  } catch (error) {
    console.error('[GET /reports/:id] Error:', error.message);

    if (error.message.includes('Access denied')) {
      return res.status(403).json({ success: false, error: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }

    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/reports/:reportId/summary
 * @desc    Lightweight summary: readiness score, section scores, gap counts, top 3 recommendations.
 *          Used for list cards and dashboards (avoids sending full turn array).
 * @access  Private
 */
router.get('/:reportId/summary', async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.userId || req.user?.id;

    const report = await ReportService.getReportById(reportId, userId);

    const summary = {
      _id: report._id,
      sessionId: report.sessionId,
      session: report.session,
      readinessScore: report.readinessScore,
      readinessLabel: report.readinessLabel,
      sectionScores: report.sectionScores,
      skillGapSummary: {
        total: report.skillGapSummary.total,
        critical: report.skillGapSummary.critical,
        major: report.skillGapSummary.major,
        minor: report.skillGapSummary.minor,
      },
      strengths: report.strengths.slice(0, 3),
      weaknesses: report.weaknesses.slice(0, 3),
      recommendations: report.recommendations.slice(0, 3),
      summary: report.summary,
      createdAt: report.createdAt,
    };

    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error('[GET /reports/:id/summary] Error:', error.message);

    if (error.message.includes('Access denied')) {
      return res.status(403).json({ success: false, error: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }

    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   DELETE /api/reports/:reportId
 * @desc    Delete a report.
 * @access  Private
 */
router.delete('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.userId || req.user?.id;

    await ReportService.deleteReport(reportId, userId);

    return res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    console.error('[DELETE /reports/:id] Error:', error.message);

    if (error.message.includes('Access denied')) {
      return res.status(403).json({ success: false, error: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }

    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
