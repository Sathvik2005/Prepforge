import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, X, Volume2, VolumeX } from 'lucide-react';

const FocusMode = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('focus'); // focus, short-break, long-break
  const [sessions, setSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [settings, setSettings] = useState({
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
  });

  useEffect(() => {
    let interval = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const handleTimerComplete = () => {
    setIsActive(false);
    if (soundEnabled) {
      // Play completion sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHW7A7+OZUQ4RXKP');
      audio.play().catch(() => {});
    }

    if (mode === 'focus') {
      setSessions((prev) => prev + 1);
      if ((sessions + 1) % 4 === 0) {
        switchMode('long-break');
      } else {
        switchMode('short-break');
      }
    } else {
      switchMode('focus');
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setTimeLeft(settings[newMode === 'focus' ? 'focus' : newMode === 'short-break' ? 'shortBreak' : 'longBreak'] * 60);
    setIsActive(false);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(settings[mode === 'focus' ? 'focus' : mode === 'short-break' ? 'shortBreak' : 'longBreak'] * 60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((settings[mode === 'focus' ? 'focus' : mode === 'short-break' ? 'shortBreak' : 'longBreak'] * 60 - timeLeft) / (settings[mode === 'focus' ? 'focus' : mode === 'short-break' ? 'shortBreak' : 'longBreak'] * 60)) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
        />
      </div>

      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-8 right-8 p-3 rounded-xl glass hover:glass-strong transition-all z-10"
      >
        {showSettings ? <X className="w-5 h-5" /> : '⚙️'}
      </button>

      {/* Sound Toggle */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute top-8 left-8 p-3 rounded-xl glass hover:glass-strong transition-all z-10"
      >
        {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-20 right-8 glass-strong rounded-2xl p-6 w-80 z-20"
          >
            <h3 className="text-xl font-semibold mb-4">Timer Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Focus Duration (minutes)</label>
                <input
                  type="number"
                  value={settings.focus}
                  onChange={(e) => setSettings({ ...settings, focus: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg glass text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="60"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Short Break (minutes)</label>
                <input
                  type="number"
                  value={settings.shortBreak}
                  onChange={(e) => setSettings({ ...settings, shortBreak: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg glass text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="30"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Long Break (minutes)</label>
                <input
                  type="number"
                  value={settings.longBreak}
                  onChange={(e) => setSettings({ ...settings, longBreak: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg glass text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="60"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 text-center">
        {/* Mode Selector */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center space-x-4 mb-12"
        >
          {[
            { key: 'focus', label: 'Focus', emoji: '🎯' },
            { key: 'short-break', label: 'Short Break', emoji: '☕' },
            { key: 'long-break', label: 'Long Break', emoji: '🌴' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => switchMode(item.key)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                mode === item.key
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 glow'
                  : 'glass hover:glass-strong'
              }`}
            >
              <span className="mr-2">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </motion.div>

        {/* Timer Display */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-12 relative"
        >
          {/* Progress Circle */}
          <svg className="w-96 h-96 mx-auto" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <motion.circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
              transform="rotate(-90 100 100)"
              initial={{ strokeDashoffset: 2 * Math.PI * 90 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 90 * (1 - progress / 100) }}
              transition={{ duration: 0.5 }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>

          {/* Time Display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div>
              <motion.div
                key={timeLeft}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="text-8xl font-bold gradient-text mb-4"
              >
                {formatTime(timeLeft)}
              </motion.div>
              <p className="text-xl text-gray-400">
                {mode === 'focus' ? 'Stay Focused' : mode === 'short-break' ? 'Take a Break' : 'Long Break'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center space-x-6"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTimer}
            className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all glow flex items-center justify-center"
          >
            {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetTimer}
            className="w-20 h-20 rounded-full glass hover:glass-strong transition-all flex items-center justify-center"
          >
            <RotateCcw className="w-6 h-6" />
          </motion.button>
        </motion.div>

        {/* Session Counter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <p className="text-gray-400 mb-3">Sessions Completed Today</p>
          <div className="flex justify-center space-x-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index < sessions ? 'bg-gradient-to-r from-green-400 to-emerald-400' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
          <p className="text-2xl font-bold gradient-text mt-3">{sessions} / 8</p>
        </motion.div>
      </div>
    </div>
  );
};

export default FocusMode;
