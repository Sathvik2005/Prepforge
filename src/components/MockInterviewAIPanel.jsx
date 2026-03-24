/**
 * MockInterviewAIPanel.jsx
 * Side-panel UI for the AI interviewer flow inside MockInterviewRoom.
 * Shows: current question, STT answer box, evaluation scores, follow-up, coding problems.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, Mic, MicOff, Send, CheckCircle, AlertCircle,
  Code, Zap, TrendingUp, MessageCircle, RotateCcw,
} from 'lucide-react';
import MockInterviewAvatar from './MockInterviewAvatar';

/* ─── Score Ring ──────────────────────────────────────────── */
function ScoreRing({ score, label, size = 56 }) {
  const radius = (size - 10) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 10) * circ;
  const color =
    score >= 8 ? '#22c55e' : score >= 6 ? '#3b82f6' : score >= 4 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={5} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          strokeLinecap="round"
        />
        <text
          x="50%" y="50%"
          dominantBaseline="middle" textAnchor="middle"
          className="rotate-90" transform={`rotate(90, ${size / 2}, ${size / 2})`}
          fill={color} fontSize={size * 0.22} fontWeight="bold"
        >
          {score}
        </text>
      </svg>
      <span className="text-[10px] text-surface-400 capitalize">{label}</span>
    </div>
  );
}

/* ─── Evaluation Card ─────────────────────────────────────── */
function EvaluationCard({ evaluation, followUpQuestion }) {
  if (!evaluation) return null;
  const dims = ['clarity', 'technicalAccuracy', 'depth', 'structure', 'relevance'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl bg-surface-800 border border-surface-700 p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4 text-green-400" /> Instant Evaluation
        </span>
        <span className="text-2xl font-bold text-royal-400">{evaluation.overallScore}<span className="text-sm text-surface-400">/100</span></span>
      </div>

      {/* Dimension rings */}
      <div className="flex flex-wrap justify-around gap-3">
        {dims.map((d) => (
          <ScoreRing key={d} score={evaluation[d]?.score ?? 0} label={d.replace(/([A-Z])/g, ' $1').trim()} />
        ))}
      </div>

      {/* Feedback text */}
      {evaluation.feedback && (
        <p className="text-xs text-surface-300 leading-relaxed border-t border-surface-700 pt-3">
          {evaluation.feedback}
        </p>
      )}

      {/* Per-dim comments */}
      <div className="space-y-1.5">
        {dims.map((d) =>
          evaluation[d]?.comment ? (
            <div key={d} className="flex gap-2 text-xs">
              <span className="text-surface-500 capitalize min-w-[82px]">
                {d.replace(/([A-Z])/g, ' $1').trim()}:
              </span>
              <span className="text-surface-300">{evaluation[d].comment}</span>
            </div>
          ) : null
        )}
      </div>

      {/* Follow-up indicator */}
      {followUpQuestion && (
        <div className="rounded-lg bg-royal-900/30 border border-royal-700 p-3 flex gap-2">
          <MessageCircle className="w-4 h-4 text-royal-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-royal-300 mb-0.5">Follow-up</p>
            <p className="text-xs text-surface-300">{followUpQuestion}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Difficulty Badge ────────────────────────────────────── */
function DifficultyBadge({ level }) {
  const map = {
    easy: 'bg-green-500/20 text-green-300 border-green-700',
    medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-700',
    hard: 'bg-red-500/20 text-red-300 border-red-700',
    system_design: 'bg-purple-500/20 text-purple-300 border-purple-700',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide ${map[level] || map.medium}`}>
      {level?.replace('_', ' ')}
    </span>
  );
}

/* ─── Coding Problem Card ─────────────────────────────────── */
function CodingProblemCard({ problem, onDismiss }) {
  if (!problem) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-surface-800 border border-surface-700 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white flex items-center gap-1.5">
          <Code className="w-4 h-4 text-yellow-400" /> {problem.title}
        </span>
        <DifficultyBadge level={problem.difficulty} />
      </div>
      <p className="text-xs text-surface-300 leading-relaxed">{problem.description}</p>
      {problem.examples?.[0] && (
        <div className="rounded bg-surface-900 p-2 font-mono text-xs text-green-300">
          <div>Input:  {problem.examples[0].input}</div>
          <div>Output: {problem.examples[0].output}</div>
        </div>
      )}
      {problem.constraints?.length > 0 && (
        <ul className="text-xs text-surface-400 space-y-0.5 list-disc pl-4">
          {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      )}
      {problem.hints?.[0] && (
        <div className="flex gap-1.5 items-start text-xs text-yellow-400">
          <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Hint: {problem.hints[0]}</span>
        </div>
      )}
      {onDismiss && (
        <button onClick={onDismiss} className="text-xs text-surface-500 hover:text-white flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> Request different problem
        </button>
      )}
    </motion.div>
  );
}

/* ─── Main Panel ──────────────────────────────────────────── */
const MockInterviewAIPanel = ({
  /* from useMockInterviewAI */
  currentQuestion,
  currentAnswer,
  setCurrentAnswer,
  answerSubmitted,
  currentEvaluation,
  evaluationComplete,
  followUpQuestion,
  currentDifficulty,
  codingProblem,
  isAISpeaking,
  aiText,
  isListening,
  transcript,
  isLoading,
  turns,

  /* actions */
  requestNextQuestion,
  requestCodingProblem,
  submitAnswer,
  speakText,
  stopSpeaking,
  startListening,
  stopListening,

  /* avatar prefs */
  muted,
  onMuteToggle,
}) => {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 text-white">

      {/* Avatar */}
      <MockInterviewAvatar
        isAISpeaking={isAISpeaking}
        currentText={aiText}
        muted={muted}
        onSpeakToggle={onMuteToggle}
      />

      {/* Current Question */}
      <AnimatePresence mode="wait">
        {currentQuestion ? (
          <motion.div
            key={currentQuestion.questionText}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl bg-surface-800 border border-surface-700 p-4 space-y-2"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-surface-400 uppercase tracking-wider font-semibold">
                Question {turns.length + 1}
              </span>
              <DifficultyBadge level={currentDifficulty} />
            </div>
            <p className="text-sm text-white leading-relaxed">{currentQuestion.questionText}</p>
            {currentQuestion.questionType === 'coding' && (
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <Code className="w-3 h-3" /> Switch to the Code tab to answer
              </span>
            )}
            {/* Re-speak button */}
            <button
              onClick={() => speakText(currentQuestion.questionText)}
              className="text-xs text-royal-400 hover:text-royal-300 flex items-center gap-1 mt-1"
            >
              <TrendingUp className="w-3 h-3" /> Hear question again
            </button>
          </motion.div>
        ) : (
          <div className="rounded-xl border border-dashed border-surface-700 p-6 text-center text-surface-500 text-sm">
            {isLoading ? 'Generating question…' : 'Press "Next Question" to begin'}
          </div>
        )}
      </AnimatePresence>

      {/* Coding problem card */}
      <AnimatePresence>
        {codingProblem && (
          <CodingProblemCard
            problem={codingProblem}
            onDismiss={() => requestCodingProblem()}
          />
        )}
      </AnimatePresence>

      {/* Answer input + STT */}
      {currentQuestion && !evaluationComplete && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-surface-400 font-medium">Your Answer</label>
            <button
              onClick={isListening ? stopListening : startListening}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition ${
                isListening
                  ? 'bg-red-500/20 border-red-500 text-red-300 animate-pulse'
                  : 'bg-surface-700 border-surface-600 text-surface-300 hover:text-white'
              }`}
            >
              {isListening ? <><MicOff className="w-3 h-3" /> Stop</>
                           : <><Mic className="w-3 h-3" /> Speak</>}
            </button>
          </div>
          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            disabled={answerSubmitted}
            placeholder={isListening ? '🎙 Listening…' : 'Type your answer or use voice input…'}
            rows={5}
            className="w-full bg-surface-900 border border-surface-700 rounded-lg p-3 text-sm text-white placeholder-surface-500 resize-none focus:outline-none focus:border-royal-500 disabled:opacity-50"
          />
          {transcript && (
            <p className="text-xs text-surface-400 italic">Transcript: {transcript}</p>
          )}
          <button
            onClick={() => submitAnswer(currentAnswer)}
            disabled={!currentAnswer.trim() || answerSubmitted || isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-royal-600 hover:bg-royal-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition"
          >
            {isLoading ? (
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <><Send className="w-4 h-4" /> Submit Answer</>
            )}
          </button>
        </div>
      )}

      {/* Evaluation */}
      <AnimatePresence>
        {evaluationComplete && (
          <EvaluationCard evaluation={currentEvaluation} followUpQuestion={followUpQuestion} />
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => requestNextQuestion()}
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-surface-700 hover:bg-surface-600 text-sm transition disabled:opacity-40"
        >
          <ChevronRight className="w-4 h-4" />
          {evaluationComplete ? 'Next Question' : 'Skip'}
        </button>
        <button
          onClick={() => requestCodingProblem()}
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-700 text-yellow-300 text-sm transition disabled:opacity-40"
        >
          <Code className="w-4 h-4" />
          Coding Task
        </button>
      </div>

      {/* Q&A history toggle */}
      {turns.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs text-surface-400 hover:text-white flex items-center gap-1"
          >
            <TrendingUp className="w-3 h-3" />
            {showHistory ? 'Hide' : 'Show'} history ({turns.length} answered)
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-2 space-y-2"
              >
                {turns.map((t, i) => (
                  <div key={i} className="rounded-lg bg-surface-800 border border-surface-700 p-3 text-xs space-y-1">
                    <p className="text-surface-400 font-medium">Q{i + 1}: {t.questionText}</p>
                    {t.evaluation && (
                      <p className="text-royal-400">Score: {t.evaluation.overallScore}/10</p>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default MockInterviewAIPanel;
