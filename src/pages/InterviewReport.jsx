import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Award, TrendingUp, TrendingDown, AlertCircle,
  ChevronDown, ChevronUp, Calendar, RotateCcw, Loader2,
  CheckCircle2, XCircle, MinusCircle
} from 'lucide-react';
import api from '../services/api';

function ScoreCircle({ score, size = 120, label }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text
          x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize={size * 0.22} fontWeight="700"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
        >
          {score}
        </text>
      </svg>
      {label && <p className="text-gray-400 text-sm text-center">{label}</p>}
    </div>
  );
}

function QuestionCard({ item, index, question }) {
  const [open, setOpen] = useState(false);
  const score = item?.score ?? 0;
  const skipped = question?.skipped;

  const color = skipped ? 'border-gray-600' : score >= 8 ? 'border-green-500' : score >= 5 ? 'border-yellow-500' : 'border-red-500';
  const Icon = skipped ? MinusCircle : score >= 8 ? CheckCircle2 : score >= 5 ? AlertCircle : XCircle;
  const iconColor = skipped ? 'text-gray-400' : score >= 8 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`glass rounded-xl border ${color} overflow-hidden`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 p-4 text-left"
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium line-clamp-1">
            Q{index + 1}: {question?.question || 'Question'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {!skipped && (
            <span className={`text-sm font-bold ${iconColor}`}>{score}/10</span>
          )}
          {skipped && <span className="text-gray-400 text-xs">Skipped</span>}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {question?.answer && (
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Your Answer</p>
              <p className="text-gray-300 text-sm bg-white/5 rounded-lg p-3">{question.answer}</p>
            </div>
          )}
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Feedback</p>
            <p className="text-gray-200 text-sm">{item?.feedback || 'No feedback available.'}</p>
          </div>
          {item?.strengths?.length > 0 && (
            <div>
              <p className="text-green-400 text-xs uppercase tracking-wider mb-1">Strengths</p>
              <ul className="space-y-1">
                {item.strengths.map((s, i) => (
                  <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item?.improvements?.length > 0 && (
            <div>
              <p className="text-yellow-400 text-xs uppercase tracking-wider mb-1">Improvements</p>
              <ul className="space-y-1">
                {item.improvements.map((s, i) => (
                  <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function InterviewReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/interviews/${id}`);
        const data = res.data;
        setInterview(data);
        if (data.aiReport) {
          setReport(data.aiReport);
        } else {
          setError('Report not ready yet. Please wait a moment.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading your report…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold mb-2">Report Unavailable</p>
          <p className="text-gray-400 mb-6">{error}</p>
          <button onClick={() => navigate('/schedule-interview')} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
            Schedule New Interview
          </button>
        </div>
      </div>
    );
  }

  const overallScore = report.overallScore ?? 0;
  const readinessScore = report.readinessScore ?? overallScore;
  const scoreLabel = overallScore >= 75 ? 'Excellent' : overallScore >= 55 ? 'Good' : overallScore >= 35 ? 'Needs Practice' : 'Keep Practicing';
  const scoreColor = overallScore >= 75 ? 'text-green-400' : overallScore >= 55 ? 'text-yellow-400' : 'text-red-400';

  // Reconstruct per-question answers from interview
  const answeredQuestions = (() => {
    if (!interview) return [];
    const qs = interview.questions || [];
    return (report.perQuestion || []).map((pq, i) => ({
      question: qs[i]?.questionText || `Question ${i + 1}`,
      answer: null, // not stored on interview anymore
      skipped: pq.score === 0 && pq.feedback === 'Skipped',
    }));
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] pt-24 px-4 pb-16">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <Award className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <h1 className="text-4xl font-bold text-white mb-2">Interview Report</h1>
          {interview && (
            <p className="text-gray-400 capitalize">
              {interview.type?.replace('-', ' ')} · {interview.mode} interview
            </p>
          )}
        </motion.div>

        {/* Score summary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-3xl p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreCircle score={overallScore} size={140} label="Overall Score" />
            <div className="flex-1 text-center md:text-left">
              <p className={`text-3xl font-bold mb-1 ${scoreColor}`}>{scoreLabel}</p>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">{report.overallFeedback}</p>
              {report.explanation && (
                <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-300 border border-white/10">
                  <p className="font-semibold text-white mb-1">Why this score?</p>
                  {report.explanation}
                </div>
              )}
            </div>
            <ScoreCircle score={readinessScore} size={100} label="Readiness" />
          </div>
        </motion.div>

        {/* Strengths & Improvements */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {report.strengths?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h3 className="text-white font-semibold">Strengths</h3>
              </div>
              <ul className="space-y-2">
                {report.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {report.improvements?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-yellow-400" />
                <h3 className="text-white font-semibold">Areas to Improve</h3>
              </div>
              <ul className="space-y-2">
                {report.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                    <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>

        {/* Per-question breakdown */}
        {Array.isArray(report.perQuestion) && report.perQuestion.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
            <h2 className="text-white text-xl font-bold mb-4">Question Breakdown</h2>
            <div className="space-y-3">
              {report.perQuestion.map((item, i) => (
                <QuestionCard key={i} item={item} index={i} question={answeredQuestions[i] || {}} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={() => navigate('/schedule-interview')}
            className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <Calendar className="w-5 h-5" /> Schedule Another Interview
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-5 h-5" /> Back to Dashboard
          </button>
        </motion.div>
      </div>
    </div>
  );
}
