import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Video,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  TrendingUp,
  Brain,
  Code,
  MessageSquare,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';

const MockInterview = () => {
  const [selectedRound, setSelectedRound] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [timer, setTimer] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    let interval;
    if (isActive) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const rounds = [
    {
      name: 'MCQ Round',
      icon: CheckCircle2,
      duration: 30,
      questions: 20,
      description: 'Technical multiple-choice questions',
      gradient: 'from-blue-500 to-cyan-500',
      type: 'mcq',
    },
    {
      name: 'Coding Round',
      icon: Code,
      duration: 60,
      questions: 3,
      description: 'Solve coding problems',
      gradient: 'from-purple-500 to-pink-500',
      type: 'coding',
    },
    {
      name: 'Behavioral Round',
      icon: MessageSquare,
      duration: 45,
      questions: 8,
      description: 'Situational and behavioral questions',
      gradient: 'from-green-500 to-emerald-500',
      type: 'behavioral',
    },
  ];

  const mockQuestions = {
    mcq: [
      {
        question: 'What is the output of: console.log(typeof null)?',
        options: ['null', 'undefined', 'object', 'number'],
        correct: 2,
      },
      {
        question: 'Which HTTP method is idempotent?',
        options: ['POST', 'PUT', 'PATCH', 'All of the above'],
        correct: 1,
      },
    ],
    coding: [
      {
        question: 'Implement a function to reverse a linked list',
        difficulty: 'Medium',
        timeLimit: 20,
      },
      {
        question: 'Find the longest palindromic substring',
        difficulty: 'Hard',
        timeLimit: 25,
      },
    ],
    behavioral: [
      {
        question: 'Tell me about a time when you had to work under pressure.',
        tips: 'Use the STAR method: Situation, Task, Action, Result',
      },
      {
        question: 'Describe a challenging project you worked on.',
        tips: 'Focus on your role and the impact you made',
      },
    ],
  };

  const startRound = (round) => {
    setSelectedRound(round);
    setIsActive(true);
    setTimer(0);
    setCurrentQuestion(0);
    setAnswers([]);
    setShowResults(false);
  };

  const endRound = () => {
    setIsActive(false);
    setShowResults(true);
    generateFeedback();
  };

  const generateFeedback = () => {
    const score = Math.floor(Math.random() * 30) + 70;
    toast.success(`Interview completed! Score: ${score}/100`);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!selectedRound) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold mb-4">
              <span className="gradient-text">Mock Interview Simulator</span>
            </h1>
            <p className="text-xl text-gray-400">
              Practice realistic interview scenarios with AI feedback
            </p>
          </motion.div>

          {/* Round Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {rounds.map((round, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-strong rounded-2xl p-8 hover:scale-105 transition-all duration-300 group"
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${round.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <round.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">{round.name}</h3>
                <p className="text-gray-400 mb-4">{round.description}</p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-gray-300">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{round.duration} minutes</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    <span>{round.questions} questions</span>
                  </div>
                </div>
                <button
                  onClick={() => startRound(round)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 font-semibold transition-all flex items-center justify-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Round</span>
                </button>
              </motion.div>
            ))}
          </div>

          {/* Past Interviews */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-2xl p-8 mt-12"
          >
            <h2 className="text-2xl font-semibold mb-6">Recent Interviews</h2>
            <div className="space-y-4">
              {[
                { round: 'MCQ Round', score: 85, date: '2 days ago', status: 'Excellent' },
                { round: 'Coding Round', score: 72, date: '5 days ago', status: 'Good' },
                { round: 'Behavioral Round', score: 90, date: '1 week ago', status: 'Outstanding' },
              ].map((interview, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl glass hover:glass-strong transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold ${
                        interview.score >= 80
                          ? 'bg-green-500/20 text-green-400'
                          : interview.score >= 60
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {interview.score}
                    </div>
                    <div>
                      <h4 className="font-semibold">{interview.round}</h4>
                      <p className="text-sm text-gray-400">{interview.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-blue-400">
                      {interview.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (showResults) {
    const score = Math.floor(Math.random() * 30) + 70;
    const feedback = {
      strengths: [
        'Strong problem-solving approach',
        'Good code organization',
        'Clear communication',
      ],
      improvements: [
        'Consider edge cases more thoroughly',
        'Optimize time complexity',
        'Add more test cases',
      ],
      nextSteps: [
        'Practice more dynamic programming',
        'Review system design patterns',
        'Work on behavioral responses',
      ],
    };

    return (
      <div className="min-h-screen pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Award className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Interview Complete! 🎉</h1>
            <div className="text-6xl font-bold gradient-text mb-2">{score}/100</div>
            <p className="text-xl text-gray-400">
              {score >= 80 ? 'Excellent Performance!' : score >= 60 ? 'Good Job!' : 'Keep Practicing!'}
            </p>
          </motion.div>

          {/* Feedback Sections */}
          <div className="space-y-6">
            <div className="glass-strong rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center text-green-400">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Strengths
              </h3>
              <ul className="space-y-2">
                {feedback.strengths.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-strong rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center text-yellow-400">
                <AlertCircle className="w-5 h-5 mr-2" />
                Areas for Improvement
              </h3>
              <ul className="space-y-2">
                {feedback.improvements.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-yellow-400 mr-2">!</span>
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-strong rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center text-blue-400">
                <TrendingUp className="w-5 h-5 mr-2" />
                Next Steps
              </h3>
              <ul className="space-y-2">
                {feedback.nextSteps.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-400 mr-2">→</span>
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex space-x-4 mt-8">
            <button
              onClick={() => {
                setSelectedRound(null);
                setShowResults(false);
              }}
              className="flex-1 py-3 rounded-xl glass hover:glass-strong transition-all font-semibold"
            >
              Back to Rounds
            </button>
            <button
              onClick={() => startRound(selectedRound)}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all font-semibold flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="container mx-auto max-w-4xl">
        {/* Timer & Controls */}
        <div className="glass-strong rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{selectedRound.name}</h2>
              <p className="text-gray-400">Question {currentQuestion + 1} of {selectedRound.questions}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold gradient-text">{formatTime(timer)}</div>
              <div className="text-sm text-gray-400">
                Time limit: {selectedRound.duration}:00
              </div>
            </div>
          </div>
          <div className="mt-4 flex space-x-4">
            <button
              onClick={() => setIsActive(!isActive)}
              className="px-6 py-2 rounded-lg glass hover:glass-strong transition-all flex items-center space-x-2"
            >
              {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isActive ? 'Pause' : 'Resume'}</span>
            </button>
            <button
              onClick={endRound}
              className="px-6 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-all text-red-400"
            >
              End Interview
            </button>
          </div>
        </div>

        {/* Question Content */}
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-strong rounded-2xl p-8"
        >
          <h3 className="text-2xl font-semibold mb-6">
            {selectedRound.type === 'mcq' && mockQuestions.mcq[currentQuestion % 2].question}
            {selectedRound.type === 'coding' && mockQuestions.coding[currentQuestion % 2].question}
            {selectedRound.type === 'behavioral' && mockQuestions.behavioral[currentQuestion % 2].question}
          </h3>

          {selectedRound.type === 'mcq' && (
            <div className="space-y-4">
              {mockQuestions.mcq[currentQuestion % 2].options.map((option, index) => (
                <button
                  key={index}
                  className="w-full p-4 rounded-xl glass hover:glass-strong transition-all text-left"
                >
                  <div className="flex items-center">
                    <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mr-4 font-semibold">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedRound.type === 'coding' && (
            <div className="space-y-4">
              <textarea
                placeholder="Write your solution here..."
                className="w-full h-64 p-4 rounded-xl glass text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <button className="px-6 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all">
                Run Code
              </button>
            </div>
          )}

          {selectedRound.type === 'behavioral' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-400/30">
                <Brain className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-sm text-gray-300">
                  {mockQuestions.behavioral[currentQuestion % 2].tips}
                </p>
              </div>
              <textarea
                placeholder="Type your answer here..."
                className="w-full h-48 p-4 rounded-xl glass text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <button
            onClick={() => {
              if (currentQuestion < selectedRound.questions - 1) {
                setCurrentQuestion((prev) => prev + 1);
              } else {
                endRound();
              }
            }}
            className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 font-semibold transition-all"
          >
            {currentQuestion < selectedRound.questions - 1 ? 'Next Question' : 'Finish Interview'}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default MockInterview;
