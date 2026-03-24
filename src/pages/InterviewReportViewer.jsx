/**
 * InterviewReportViewer
 *
 * Full-detail interview report page.
 * Route: /interview/report/:reportId   (also accepts :sessionId via /interview/:sessionId/report)
 *
 * Features:
 *   - Overall readiness score + grade
 *   - Section scores (technical, behavioral, communication, problemSolving)
 *   - Per-turn question/answer/rubric breakdown
 *   - Skill gap analysis with clusters
 *   - Strengths & weaknesses
 *   - Recommendations
 *   - Performance trend chart
 *   - PDF download (browser print API)
 *   - Compare with previous interview (if history available)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  ArrowLeft,
  BarChart2,
  BookOpen,
  Layers,
  MessageSquare,
  Target,
  Zap,
  Clock,
  Star,
} from 'lucide-react';
import { reportsAPI, interviewAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

// ── Helpers ──────────────────────────────────────────────────────────────────

const scoreColor = (score) => {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
};

const scoreBg = (score) => {
  if (score >= 80) return 'bg-emerald-50 border-emerald-200';
  if (score >= 60) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
};

const gradeFromScore = (score) => {
  if (score >= 90) return { grade: 'A', label: 'Excellent' };
  if (score >= 75) return { grade: 'B', label: 'Strong' };
  if (score >= 60) return { grade: 'C', label: 'Competent' };
  if (score >= 45) return { grade: 'D', label: 'Developing' };
  return { grade: 'F', label: 'Needs Work' };
};

const ScoreRing = ({ score, size = 100, strokeWidth = 10 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        className="transition-all duration-1000"
      />
    </svg>
  );
};

const ScoreBar = ({ label, score, max = 100 }) => (
  <div className="mb-3">
    <div className="flex justify-between text-sm mb-1">
      <span className="text-gray-600 font-medium">{label}</span>
      <span className={`font-bold ${scoreColor(score)}`}>{Math.round(score ?? 0)}</span>
    </div>
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${((score ?? 0) / max) * 100}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-2 rounded-full ${
          (score ?? 0) >= 80
            ? 'bg-emerald-500'
            : (score ?? 0) >= 60
            ? 'bg-yellow-400'
            : 'bg-red-400'
        }`}
      />
    </div>
  </div>
);

const TurnCard = ({ turn, index }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-gray-800 text-left line-clamp-1">
            {turn.questionText}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 hidden sm:block">
            {turn.questionType}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-bold ${scoreColor(turn.turnScore)}`}>
            {Math.round(turn.turnScore ?? 0)}
          </span>
          {open ? (
            <ChevronDown size={16} className="text-gray-500" />
          ) : (
            <ChevronRight size={16} className="text-gray-500" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-4 space-y-4"
          >
            {/* Answer */}
            {turn.answerText && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Your Answer</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{turn.answerText}</p>
                {turn.videoUrl && (
                  <a
                    href={turn.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    ▶ Watch Recording
                  </a>
                )}
              </div>
            )}

            {/* Rubric Scores */}
            {turn.rubric && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Rubric Scores</p>
                <div className="grid grid-cols-2 gap-x-6">
                  {Object.entries(turn.rubric)
                    .filter(([, v]) => v !== undefined)
                    .map(([key, val]) => (
                      <ScoreBar key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} score={val} />
                    ))}
                </div>
              </div>
            )}

            {/* Feedback */}
            {turn.feedback && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {turn.feedback.positive?.length > 0 && (
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="font-semibold text-emerald-700 mb-1">✅ Strengths</p>
                    <ul className="space-y-1">
                      {turn.feedback.positive.map((p, i) => (
                        <li key={i} className="text-emerald-600">• {p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {turn.feedback.negative?.length > 0 && (
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="font-semibold text-red-700 mb-1">⚠ Gaps</p>
                    <ul className="space-y-1">
                      {turn.feedback.negative.map((n, i) => (
                        <li key={i} className="text-red-600">• {n}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {turn.feedback.suggestions?.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="font-semibold text-blue-700 mb-1">💡 Suggestions</p>
                    <ul className="space-y-1">
                      {turn.feedback.suggestions.map((s, i) => (
                        <li key={i} className="text-blue-600">• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Gaps */}
            {turn.gaps?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Detected Gaps</p>
                <div className="flex flex-wrap gap-2">
                  {turn.gaps.map((g, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-1 rounded-full ${
                        g.severity === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : g.severity === 'major'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {g.skill} ({g.gapType?.replace('-', ' ')})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function InterviewReportViewer() {
  const { reportId, sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (reportId) {
        const res = await reportsAPI.get(reportId);
        data = res.data?.data || res.data;
      } else if (sessionId) {
        const res = await interviewAPI.getReport(sessionId, user?._id || user?.id);
        data = res.data?.data || res.data;
      } else {
        throw new Error('No report ID or session ID provided');
      }
      setReport(data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [reportId, sessionId, user]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Load interview history for comparison
  useEffect(() => {
    if (user?._id || user?.id) {
      interviewAPI
        .getHistory(user._id || user.id)
        .then((res) => setHistory(res.data?.data || []))
        .catch(() => {});
    }
  }, [user]);

  const handleDownloadPDF = () => {
    window.print();
  };

  // ── States ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your interview report…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Report Unavailable</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const { grade, label: gradeLabel } = gradeFromScore(report.readinessScore);
  const overallScore = report.readinessScore ?? report.sectionScores?.overall ?? 0;
  const ss = report.sectionScores || {};

  // Previous interview for comparison
  const otherInterviews = history.filter(
    (h) => h.reportId?.toString() !== report._id?.toString()
  );
  const prevInterview = otherInterviews[0];

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Print stylesheet via inline style */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 no-print">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="font-bold text-gray-900">Interview Report</h1>
              <p className="text-sm text-gray-500">
                {report.session?.targetRole || 'Software Engineer'} ·{' '}
                {report.session?.interviewType || 'Technical'}
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Download size={16} />
            Download PDF
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ── Hero / Overall Score ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 flex flex-col sm:flex-row items-center gap-6"
        >
          {/* Score ring */}
          <div className="relative shrink-0">
            <ScoreRing score={overallScore} size={120} strokeWidth={12} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-black ${scoreColor(overallScore)}`}>
                {Math.round(overallScore)}
              </span>
              <span className="text-xs text-gray-400">/100</span>
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="text-4xl font-black text-gray-200 leading-none">{grade}</span>
              <span
                className={`text-lg font-bold px-3 py-1 rounded-full border ${scoreBg(
                  overallScore
                )} ${scoreColor(overallScore)}`}
              >
                {report.readinessLabel || gradeLabel}
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-4">{report.summary}</p>

            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Clock size={14} />
                {Math.round((report.session?.durationSeconds || 0) / 60)} min
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <MessageSquare size={14} />
                {report.session?.totalTurns || report.turns?.length || 0} questions
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Target size={14} />
                {report.session?.targetRole || '—'}
              </div>
              {report.session?.completedAt && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Star size={14} />
                  {new Date(report.session.completedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Comparison badge */}
          {prevInterview && (
            <div className="shrink-0 text-center">
              <p className="text-xs text-gray-400 mb-1">vs Previous</p>
              {overallScore >= prevInterview.overallScore ? (
                <div className="flex items-center gap-1 text-emerald-600 font-semibold text-sm">
                  <TrendingUp size={16} />
                  +{Math.round(overallScore - prevInterview.overallScore)} pts
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-500 font-semibold text-sm">
                  <TrendingDown size={16} />
                  {Math.round(overallScore - prevInterview.overallScore)} pts
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 no-print overflow-x-auto">
          {[
            { id: 'overview', icon: <BarChart2 size={15} />, label: 'Overview' },
            { id: 'turns', icon: <MessageSquare size={15} />, label: 'Questions' },
            { id: 'gaps', icon: <Layers size={15} />, label: 'Skill Gaps' },
            { id: 'recommendations', icon: <BookOpen size={15} />, label: 'Improvement' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Section Scores */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Zap size={18} className="text-blue-600" /> Section Scores
              </h2>
              <div className="grid sm:grid-cols-2 gap-x-8">
                {ss.technical?.score !== undefined && (
                  <ScoreBar label="Technical Knowledge" score={ss.technical.score} />
                )}
                {ss.behavioral?.score !== undefined && (
                  <ScoreBar label="Behavioral" score={ss.behavioral.score} />
                )}
                {ss.communication?.score !== undefined && (
                  <ScoreBar label="Communication" score={ss.communication.score} />
                )}
                {ss.problemSolving?.score !== undefined && (
                  <ScoreBar label="Problem Solving" score={ss.problemSolving.score} />
                )}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} /> Strengths
                </h3>
                <ul className="space-y-2">
                  {(report.strengths || []).map((s, i) => (
                    <li key={i} className="text-sm text-emerald-700 flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">✓</span> {s}
                    </li>
                  ))}
                  {!report.strengths?.length && (
                    <li className="text-sm text-gray-400 italic">No clear strengths identified yet.</li>
                  )}
                </ul>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
                <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                  <AlertCircle size={16} /> Areas to Improve
                </h3>
                <ul className="space-y-2">
                  {(report.weaknesses || []).map((w, i) => (
                    <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">→</span> {w}
                    </li>
                  ))}
                  {!report.weaknesses?.length && (
                    <li className="text-sm text-gray-400 italic">No major weaknesses detected.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Performance Trend (mini sparkline) */}
            {report.performanceTrend?.length > 1 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-600" /> Performance Across Questions
                </h2>
                <div className="flex items-end gap-1 h-16">
                  {report.performanceTrend.map((val, i) => (
                    <div
                      key={i}
                      title={`Q${i + 1}: ${Math.round(val)}`}
                      className="flex-1 rounded-t transition-all duration-500"
                      style={{
                        height: `${val}%`,
                        background:
                          val >= 80
                            ? '#10b981'
                            : val >= 60
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>Q1</span>
                  <span>Q{report.performanceTrend.length}</span>
                </div>
              </div>
            )}

            {/* Interview History comparison */}
            {otherInterviews.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 no-print">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Award size={18} className="text-blue-600" /> Interview History
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100">
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium">Role</th>
                        <th className="pb-2 font-medium">Type</th>
                        <th className="pb-2 font-medium">Score</th>
                        <th className="pb-2 font-medium">Label</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {otherInterviews.slice(0, 5).map((h) => (
                        <tr key={h._id} className="border-b border-gray-50">
                          <td className="py-2 text-gray-600">
                            {new Date(h.date).toLocaleDateString()}
                          </td>
                          <td className="py-2 text-gray-800">{h.role || '—'}</td>
                          <td className="py-2 capitalize text-gray-600">{h.type}</td>
                          <td className={`py-2 font-bold ${scoreColor(h.overallScore)}`}>
                            {Math.round(h.overallScore ?? 0)}
                          </td>
                          <td className="py-2 text-gray-500">{h.readinessLabel}</td>
                          <td className="py-2">
                            {h.reportId && (
                              <Link
                                to={`/interview/report/${h.reportId}`}
                                className="text-blue-600 hover:underline text-xs"
                              >
                                View →
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Questions Tab ────────────────────────────────────────────── */}
        {activeTab === 'turns' && (
          <motion.div
            key="turns"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare size={18} className="text-blue-600" /> Question Breakdown
              </h2>
              {(report.turns || []).length === 0 ? (
                <p className="text-gray-400 italic text-sm">No turn data available.</p>
              ) : (
                (report.turns || []).map((turn, idx) => (
                  <TurnCard key={idx} turn={turn} index={idx} />
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* ── Skill Gaps Tab ───────────────────────────────────────────── */}
        {activeTab === 'gaps' && (
          <motion.div
            key="gaps"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Stats */}
            {report.skillGapSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Gaps', val: report.skillGapSummary.total, color: 'text-gray-700' },
                  { label: 'Critical', val: report.skillGapSummary.critical, color: 'text-red-600' },
                  { label: 'Major', val: report.skillGapSummary.major, color: 'text-orange-500' },
                  { label: 'Minor', val: report.skillGapSummary.minor, color: 'text-yellow-500' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className={`text-3xl font-black ${color}`}>{val ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Gap types */}
            {report.skillGapSummary?.byType && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 grid sm:grid-cols-3 gap-4">
                {[
                  { key: 'knowledgeGaps', label: 'Knowledge Gaps', color: 'red' },
                  { key: 'explanationGaps', label: 'Explanation Gaps', color: 'orange' },
                  { key: 'depthGaps', label: 'Depth Gaps', color: 'yellow' },
                ].map(({ key, label, color }) => {
                  const items = report.skillGapSummary.byType[key] || [];
                  return (
                    <div key={key}>
                      <h3 className={`font-semibold text-${color}-700 mb-2 text-sm`}>{label}</h3>
                      {items.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">None detected</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {items.map((skill, i) => (
                            <span
                              key={i}
                              className={`text-xs px-2 py-0.5 rounded-full bg-${color}-50 text-${color}-700 border border-${color}-200`}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Clusters */}
            {report.skillGapSummary?.clusters?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Layers size={18} className="text-blue-600" /> Learning Clusters
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {report.skillGapSummary.clusters.map((cluster, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-4 ${
                        cluster.severity === 'critical'
                          ? 'border-red-200 bg-red-50'
                          : cluster.severity === 'major'
                          ? 'border-orange-200 bg-orange-50'
                          : 'border-yellow-200 bg-yellow-50'
                      }`}
                    >
                      <p className="font-semibold text-gray-800 mb-2">{cluster.clusterName}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {(cluster.skills || []).map((s, j) => (
                          <span key={j} className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-700">
                            {s}
                          </span>
                        ))}
                      </div>
                      {cluster.suggestedResource && (
                        <p className="text-xs text-gray-500">📚 {cluster.suggestedResource}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Recommendations Tab ──────────────────────────────────────── */}
        {activeTab === 'recommendations' && (
          <motion.div
            key="recommendations"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                <BookOpen size={18} className="text-blue-600" /> Personalised Improvement Plan
              </h2>
              {(report.recommendations || []).length === 0 ? (
                <p className="text-gray-400 italic">No recommendations available.</p>
              ) : (
                <ol className="space-y-4">
                  {report.recommendations.map((rec, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100"
                    >
                      <span className="shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                        {i + 1}
                      </span>
                      <p className="text-sm text-blue-900">{rec}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Provenance / Audit trail */}
            {report.provenance && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-4">
                <h2 className="font-bold text-gray-900 mb-4 text-sm">🔍 Scoring Transparency</h2>
                <div className="grid sm:grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>
                    <p className="font-semibold mb-2">Rubric Weights Used</p>
                    {report.provenance.rubricWeights &&
                      Object.entries(report.provenance.rubricWeights).map(([k, v]) => (
                        <div key={k} className="flex justify-between mb-1">
                          <span className="capitalize">{k}</span>
                          <span className="font-medium">{Math.round((v ?? 0) * 100)}%</span>
                        </div>
                      ))}
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Metadata</p>
                    <p>Engine v{report.provenance.evaluationVersion || '2.0'}</p>
                    {report.provenance.generatedAt && (
                      <p>Generated: {new Date(report.provenance.generatedAt).toLocaleString()}</p>
                    )}
                    {report.provenance.inputHash && (
                      <p className="break-all text-xs text-gray-400 mt-1">
                        Hash: {report.provenance.inputHash}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
