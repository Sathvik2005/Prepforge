/**
 * MockInterviewHistory.jsx
 * Displays the user's mock interview history with reports and score trends.
 * New standalone page – does NOT affect other interview pages.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, Calendar, Clock, ChevronRight, ArrowLeft, Trophy,
  TrendingUp, CheckCircle, AlertCircle, FileText, Bot, Zap,
} from 'lucide-react';
import { loadHistory, loadReport } from '../services/mockInterviewAI';

/* ─── helpers ────────────────────────────────────────────── */
function grade(score) {
  if (score == null) return '—';
  return score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
}
function gradeColor(g) {
  return { A: 'text-green-400', B: 'text-blue-400', C: 'text-yellow-400', D: 'text-orange-400', F: 'text-red-400' }[g] || 'text-surface-400';
}
function barColor(score) {
  return score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';
}

/* ─── Score bar ───────────────────────────────────────────── */
function ScoreBar({ label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-surface-400 w-32 capitalize">{label.replace(/([A-Z])/g, ' $1').trim()}</span>
      <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor(value)}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-semibold text-white w-8 text-right">{value}</span>
    </div>
  );
}

/* ─── Full Report View ────────────────────────────────────── */
function ReportDetail({ report, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const dims = ['clarity', 'technicalAccuracy', 'depth', 'structure', 'relevance'];
  const s = report.sectionScores || {};
  const g = grade(report.overallScore);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-surface-400 hover:text-white mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to History
      </button>

      {/* Header */}
      <div className="glass-strong rounded-2xl p-6 border border-surface-700 mb-6 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-royal-700 shrink-0">
          <span className={`text-5xl font-black ${gradeColor(g)}`}>{g}</span>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-1">Mock Interview Report</h1>
          <p className="text-surface-400 text-sm">
            {report.interviewType} · {report.targetRole} · {new Date(report.createdAt).toLocaleDateString()}
          </p>
          <p className="text-royal-400 font-semibold mt-1">
            Overall: {report.overallScore}/100 · {report.readinessLabel?.replace('-', ' ')}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><div className="text-2xl font-bold text-white">{report.questionsAsked}</div><div className="text-xs text-surface-400">Questions</div></div>
          <div><div className="text-2xl font-bold text-white">{report.answersSubmitted}</div><div className="text-xs text-surface-400">Answered</div></div>
          <div><div className="text-2xl font-bold text-white">{report.codingProblemsSolved}</div><div className="text-xs text-surface-400">Coding</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {['overview', 'questions', 'skillGaps', 'improvements'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === t ? 'bg-royal-600 text-white' : 'bg-surface-800 text-surface-400 hover:text-white'
            }`}
          >
            {t === 'skillGaps' ? 'Skill Gaps' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="glass-strong rounded-xl p-6 border border-surface-700">
              <h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
              <div className="space-y-3">
                {dims.map((d) => <ScoreBar key={d} label={d} value={s[d] ?? 0} />)}
              </div>
            </div>
            {report.strengths?.length > 0 && (
              <div className="glass-strong rounded-xl p-6 border border-surface-700">
                <h3 className="text-lg font-semibold mb-3 text-green-400">Strengths</h3>
                <ul className="space-y-2">
                  {report.strengths.map((str, i) => (
                    <li key={i} className="flex gap-2 text-sm text-surface-300">
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" /> {str}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'questions' && (
          <motion.div key="qa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {(report.turns || []).map((turn, i) => (
              <div key={i} className="glass-strong rounded-xl p-5 border border-surface-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-surface-400 font-medium">Q{i + 1} · {turn.questionType} · {turn.difficulty}</span>
                  {turn.evaluation?.overallScore != null && (
                    <span className="text-sm font-bold text-royal-400">{turn.evaluation.overallScore}/10</span>
                  )}
                </div>
                <p className="text-sm text-white mb-3">{turn.questionText}</p>
                {turn.answerText && (
                  <details className="text-xs text-surface-400">
                    <summary className="cursor-pointer hover:text-white">Your answer</summary>
                    <p className="mt-2 leading-relaxed">{turn.answerText}</p>
                  </details>
                )}
                {turn.evaluation?.feedback && (
                  <p className="mt-2 text-xs text-surface-300 italic border-t border-surface-700 pt-2">
                    {turn.evaluation.feedback}
                  </p>
                )}
              </div>
            ))}
            {(!report.turns || report.turns.length === 0) && (
              <p className="text-surface-400 text-sm">No question details recorded.</p>
            )}
          </motion.div>
        )}

        {activeTab === 'skillGaps' && (
          <motion.div key="sg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {report.skillGaps?.length > 0 ? report.skillGaps.map((gap, i) => (
              <div key={i} className={`rounded-xl p-4 border-l-4 ${
                gap.severity === 'high' ? 'bg-red-900/20 border-red-500' :
                gap.severity === 'medium' ? 'bg-yellow-900/20 border-yellow-500' :
                'bg-blue-900/20 border-blue-500'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-white">{gap.skill}</span>
                  <span className="text-xs capitalize text-surface-400">{gap.gapType} · {gap.severity}</span>
                </div>
                {gap.suggestion && <p className="text-xs text-surface-300">{gap.suggestion}</p>}
              </div>
            )) : <p className="text-surface-400 text-sm">No skill gaps identified.</p>}
          </motion.div>
        )}

        {activeTab === 'improvements' && (
          <motion.div key="imp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="glass-strong rounded-xl p-6 border border-surface-700">
              <h3 className="text-lg font-semibold mb-3 text-yellow-400">Areas to Improve</h3>
              <ul className="space-y-3">
                {report.improvements?.length > 0 ? report.improvements.map((imp, i) => (
                  <li key={i} className="flex gap-2 text-sm text-surface-300">
                    <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" /> {imp}
                  </li>
                )) : <li className="text-surface-400 text-sm">No improvements listed.</li>}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── History list ────────────────────────────────────────── */
export default function MockInterviewHistory() {
  const navigate = useNavigate();
  const { reportId, sessionId } = useParams();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    loadHistory()
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  // If routed with a sessionId or reportId, load that report directly
  useEffect(() => {
    const sid = sessionId || reportId;
    if (!sid) return;
    setReportLoading(true);
    loadReport(sid)
      .then((r) => setSelectedReport(r))
      .catch(() => {})
      .finally(() => setReportLoading(false));
  }, [sessionId, reportId]);

  const openReport = async (mockInterviewId) => {
    setReportLoading(true);
    try {
      const r = await loadReport(mockInterviewId);
      setSelectedReport(r);
    } catch {
      alert('Report not available yet.');
    } finally {
      setReportLoading(false);
    }
  };

  if (selectedReport) {
    return <ReportDetail report={selectedReport} onBack={() => setSelectedReport(null)} />;
  }

  if (reportLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <span className="animate-spin w-8 h-8 border-2 border-royal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-surface-400 hover:text-white mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center gap-3 mb-8">
        <Bot className="w-8 h-8 text-royal-400" />
        <div>
          <h1 className="text-2xl font-bold">Mock Interview History</h1>
          <p className="text-surface-400 text-sm">Your AI-powered practice sessions</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="animate-spin w-8 h-8 border-2 border-royal-500 border-t-transparent rounded-full" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-20">
          <Bot className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-surface-400 mb-2">No sessions yet</h3>
          <p className="text-surface-500 text-sm mb-6">Complete a mock interview to see your report here.</p>
          <button
            onClick={() => navigate('/mock-interview')}
            className="px-6 py-3 bg-royal-600 hover:bg-royal-700 rounded-xl text-sm font-medium transition"
          >
            Start Practice Interview
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.map((report, idx) => {
            const g = grade(report.overallScore);
            const gc = gradeColor(g);
            return (
              <motion.div
                key={report._id || idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-strong rounded-xl p-5 border border-surface-700 flex flex-col gap-3 cursor-pointer hover:border-royal-600 transition"
                onClick={() => openReport(report.mockInterviewId)}
              >
                {/* Grade + type */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-royal-400 bg-royal-900/30 px-2 py-0.5 rounded">
                    {report.interviewType || 'Mock'}
                  </span>
                  <span className={`text-3xl font-black ${gc}`}>{g}</span>
                </div>

                {/* Role */}
                <p className="text-sm font-medium text-white">{report.targetRole || 'General Interview'}</p>
                {report.readinessLabel && (
                  <p className="text-xs text-surface-400">{report.readinessLabel.replace('-', ' ')}</p>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-base font-bold text-royal-400">{report.overallScore ?? '—'}</div>
                    <div className="text-[10px] text-surface-500">Score</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-white">{report.questionsAsked ?? 0}</div>
                    <div className="text-[10px] text-surface-500">Questions</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-white">
                      {report.durationSeconds ? `${Math.round(report.durationSeconds / 60)}m` : '—'}
                    </div>
                    <div className="text-[10px] text-surface-500">Duration</div>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center justify-between text-xs text-surface-500 border-t border-surface-700 pt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1 text-royal-400 font-medium">
                    <FileText className="w-3 h-3" /> View Report <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
