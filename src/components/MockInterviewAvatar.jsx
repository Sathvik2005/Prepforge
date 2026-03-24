/**
 * MockInterviewAvatar.jsx
 * Visual AI interviewer avatar with speaking animation and TTS controls.
 * Self-contained – no dependency on other interview components.
 */
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Bot } from 'lucide-react';

/* ─── Animated mouth ring ────────────────────────────────── */
function SpeakingRings({ speaking }) {
  return (
    <div className="relative flex items-center justify-center">
      {speaking &&
        [0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border-2 border-royal-400/60"
            style={{ width: 80 + i * 28, height: 80 + i * 28 }}
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.4 }}
            transition={{ duration: 1.4, delay: i * 0.4, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}

      {/* Avatar face */}
      <motion.div
        className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-royal-500 to-indigo-600 flex items-center justify-center shadow-lg"
        animate={speaking ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={speaking ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' } : {}}
      >
        <Bot className="w-10 h-10 text-white" />
      </motion.div>
    </div>
  );
}

/* ─── Mouthbar (sound visualiser illusion) ───────────────── */
function SoundBars({ speaking }) {
  const bars = [3, 5, 7, 4, 6, 5, 3];
  return (
    <div className="flex items-end gap-0.5 h-5">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-royal-400"
          style={{ height: speaking ? undefined : 3 }}
          animate={speaking ? { height: [3, h * 2, 3] } : { height: 3 }}
          transition={
            speaking
              ? { duration: 0.5, delay: i * 0.07, repeat: Infinity, ease: 'easeInOut' }
              : {}
          }
        />
      ))}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
const MockInterviewAvatar = ({
  isAISpeaking = false,
  currentText = '',
  interviewerName = 'Alex (AI Interviewer)',
  onSpeakToggle,
  muted = false,
  compact = false,
}) => {
  const prevTextRef = useRef('');

  // Auto-scroll the subtitle into view when new text arrives
  useEffect(() => {
    prevTextRef.current = currentText;
  }, [currentText]);

  return (
    <div
      className={`flex flex-col items-center gap-3 select-none ${
        compact ? 'py-2' : 'py-5 px-6'
      } bg-white/5 backdrop-blur rounded-2xl border border-white/10`}
    >
      {/* Rings + avatar */}
      <SpeakingRings speaking={isAISpeaking && !muted} />

      {/* Name tag */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white">{interviewerName}</span>
        {!compact && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isAISpeaking && !muted ? 'bg-green-500/30 text-green-300' : 'bg-surface-700 text-surface-400'
            }`}
          >
            {isAISpeaking && !muted ? 'Speaking' : 'Ready'}
          </span>
        )}
      </div>

      {/* Sound bars */}
      {!compact && <SoundBars speaking={isAISpeaking && !muted} />}

      {/* Subtitle (scrolling last few words) */}
      {!compact && currentText && (
        <AnimatePresence mode="wait">
          <motion.p
            key={currentText.slice(-40)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="max-w-xs text-center text-xs text-white/70 leading-relaxed mt-1 italic"
          >
            "{currentText.length > 120 ? '...' + currentText.slice(-100) : currentText}"
          </motion.p>
        </AnimatePresence>
      )}

      {/* Mute / unmute button */}
      {onSpeakToggle && !compact && (
        <button
          onClick={onSpeakToggle}
          title={muted ? 'Unmute AI voice' : 'Mute AI voice'}
          className="mt-1 p-1.5 rounded-full hover:bg-white/10 transition text-surface-400 hover:text-white"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};

export default MockInterviewAvatar;
