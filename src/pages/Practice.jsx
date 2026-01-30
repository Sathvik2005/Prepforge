import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Zap,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';

const Practice = () => {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [stats, setStats] = useState({
    correct: 0,
    wrong: 0,
    streak: 0,
    accuracy: 0,
    avgTime: 0,
  });
  const [difficulty, setDifficulty] = useState('medium');
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const topics = [
    {
      name: 'Data Structures',
      icon: '🏗️',
      questions: 145,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      name: 'Algorithms',
      icon: '⚡',
      questions: 230,
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      name: 'System Design',
      icon: '🏛️',
      questions: 87,
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      name: 'JavaScript',
      icon: '📜',
      questions: 198,
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      name: 'React',
      icon: '⚛️',
      questions: 156,
      gradient: 'from-cyan-500 to-blue-500',
    },
    {
      name: 'Databases',
      icon: '🗄️',
      questions: 92,
      gradient: 'from-red-500 to-orange-500',
    },
  ];

  const sampleQuestions = {
    easy: [
      {
        question: 'What is the time complexity of accessing an element in an array by index?',
        options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'],
        correct: 0,
        explanation: 'Array access by index is O(1) constant time because arrays use contiguous memory.',
      },
      {
        question: 'Which data structure uses LIFO (Last In First Out) principle?',
        options: ['Queue', 'Stack', 'Array', 'Linked List'],
        correct: 1,
        explanation: 'Stack follows LIFO where the last element added is the first one removed.',
      },
    ],
    medium: [
      {
        question: 'What is the space complexity of merge sort?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
        correct: 2,
        explanation: 'Merge sort requires O(n) auxiliary space for merging subarrays.',
      },
      {
        question: 'Which technique is used to solve the longest common subsequence problem?',
        options: ['Greedy', 'Backtracking', 'Dynamic Programming', 'Divide and Conquer'],
        correct: 2,
        explanation: 'LCS is optimally solved using Dynamic Programming with memoization.',
      },
    ],
    hard: [
      {
        question: 'In a B-tree of order m, what is the minimum number of keys in a non-root node?',
        options: ['m/2', '⌈m/2⌉ - 1', '⌊m/2⌋', 'm - 1'],
        correct: 1,
        explanation: 'Non-root nodes in a B-tree must have at least ⌈m/2⌉ - 1 keys.',
      },
    ],
  };

  const startPractice = (topic) => {
    setSelectedTopic(topic);
    loadNextQuestion();
    setIsTimerRunning(true);
    setTimer(0);
  };

  const loadNextQuestion = () => {
    const questions = sampleQuestions[difficulty];
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    setCurrentQuestion(randomQuestion);
    setSelectedAnswer(null);
    setShowResult(false);
    setTimer(0);
  };

  const handleAnswerSelect = (index) => {
    if (!showResult) {
      setSelectedAnswer(index);
    }
  };

  const submitAnswer = () => {
    if (selectedAnswer === null) {
      toast.error('Please select an answer');
      return;
    }

    setShowResult(true);
    setIsTimerRunning(false);

    const isCorrect = selectedAnswer === currentQuestion.correct;

    if (isCorrect) {
      setStats((prev) => ({
        ...prev,
        correct: prev.correct + 1,
        streak: prev.streak + 1,
        accuracy: Math.round(
          ((prev.correct + 1) / (prev.correct + prev.wrong + 1)) * 100
        ),
      }));
      toast.success('Correct! 🎉');
      
      // Adaptive difficulty
      if (stats.streak >= 3 && difficulty !== 'hard') {
        setDifficulty(difficulty === 'easy' ? 'medium' : 'hard');
        toast('Difficulty increased! 🚀', { icon: '⬆️' });
      }
    } else {
      setStats((prev) => ({
        ...prev,
        wrong: prev.wrong + 1,
        streak: 0,
        accuracy: Math.round((prev.correct / (prev.correct + prev.wrong + 1)) * 100),
      }));
      toast.error('Incorrect. Review the explanation.');
      
      // Adaptive difficulty
      if (difficulty !== 'easy') {
        setDifficulty(difficulty === 'hard' ? 'medium' : 'easy');
        toast('Difficulty adjusted. 📊', { icon: '⬇️' });
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!selectedTopic) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold mb-4">
              <span className="gradient-text">Adaptive Practice</span>
            </h1>
            <p className="text-xl text-gray-400">
              Questions that adapt to your skill level
            </p>
          </motion.div>

          {/* Stats Overview */}
          {stats.correct + stats.wrong > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-2xl p-8 mb-12"
            >
              <h2 className="text-2xl font-semibold mb-6">Your Progress Today</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-green-400">{stats.correct}</div>
                  <div className="text-sm text-gray-400">Correct</div>
                </div>
                <div className="text-center">
                  <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-red-400">{stats.wrong}</div>
                  <div className="text-sm text-gray-400">Wrong</div>
                </div>
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-blue-400">{stats.accuracy}%</div>
                  <div className="text-sm text-gray-400">Accuracy</div>
                </div>
                <div className="text-center">
                  <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-yellow-400">{stats.streak}</div>
                  <div className="text-sm text-gray-400">Streak</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Topic Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => startPractice(topic)}
                className="glass-strong rounded-2xl p-8 hover:scale-105 transition-all duration-300 group text-left"
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${topic.gradient} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>
                  {topic.icon}
                </div>
                <h3 className="text-2xl font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                  {topic.name}
                </h3>
                <p className="text-gray-400 mb-4">{topic.questions} questions</p>
                <div className="flex items-center text-blue-400 font-medium">
                  <span>Start Practice</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => setSelectedTopic(null)}
              className="text-blue-400 hover:text-blue-300 mb-2 flex items-center"
            >
              ← Back to topics
            </button>
            <h1 className="text-3xl font-bold flex items-center">
              <span className="text-4xl mr-3">{selectedTopic.icon}</span>
              {selectedTopic.name}
            </h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-1">Difficulty</div>
            <div
              className={`px-4 py-2 rounded-lg font-semibold ${
                difficulty === 'easy'
                  ? 'bg-green-500/20 text-green-400'
                  : difficulty === 'medium'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {difficulty.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="glass-strong rounded-xl p-4 mb-8 grid grid-cols-4 gap-4">
          <div className="text-center">
            <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <div className="text-lg font-bold">{formatTime(timer)}</div>
            <div className="text-xs text-gray-400">Time</div>
          </div>
          <div className="text-center">
            <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-green-400">{stats.correct}</div>
            <div className="text-xs text-gray-400">Correct</div>
          </div>
          <div className="text-center">
            <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-blue-400">{stats.accuracy}%</div>
            <div className="text-xs text-gray-400">Accuracy</div>
          </div>
          <div className="text-center">
            <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-yellow-400">{stats.streak}</div>
            <div className="text-xs text-gray-400">Streak</div>
          </div>
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <motion.div
            key={currentQuestion.question}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-strong rounded-2xl p-8 mb-8"
          >
            <h2 className="text-2xl font-semibold mb-8">{currentQuestion.question}</h2>

            <div className="space-y-4 mb-8">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showResult}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-300 ${
                    showResult
                      ? index === currentQuestion.correct
                        ? 'bg-green-500/20 border-2 border-green-400'
                        : index === selectedAnswer
                        ? 'bg-red-500/20 border-2 border-red-400'
                        : 'glass opacity-50'
                      : selectedAnswer === index
                      ? 'bg-blue-500/20 border-2 border-blue-400'
                      : 'glass hover:glass-strong'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mr-4 font-semibold">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                    {showResult && index === currentQuestion.correct && (
                      <CheckCircle2 className="w-5 h-5 text-green-400 ml-auto" />
                    )}
                    {showResult && index === selectedAnswer && index !== currentQuestion.correct && (
                      <XCircle className="w-5 h-5 text-red-400 ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-xl bg-blue-500/10 border border-blue-400/30"
              >
                <div className="flex items-start">
                  <Brain className="w-5 h-5 text-blue-400 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-400 mb-2">Explanation</h4>
                    <p className="text-gray-300">{currentQuestion.explanation}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex space-x-4 mt-8">
              {!showResult ? (
                <button
                  onClick={submitAnswer}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 font-semibold transition-all glow"
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  onClick={loadNextQuestion}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 font-semibold transition-all flex items-center justify-center space-x-2"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Practice;
