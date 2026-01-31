import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  Target,
  Clock,
  Award,
  Download,
  BarChart3,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { gsap } from 'gsap';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

const ResearchDashboard = () => {
  const [learningBehavior, setLearningBehavior] = useState(null);
  const [skillMastery, setSkillMastery] = useState({});
  const [longitudinalProgress, setLongitudinalProgress] = useState(null);
  const [cognitiveLoad, setCognitiveLoad] = useState('optimal');
  const statsRef = useRef(null);

  useEffect(() => {
    fetchResearchData();
    
    // Animate on mount
    if (statsRef.current) {
      gsap.from(statsRef.current.children, {
        y: 50,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'back.out(1.2)',
      });
    }
  }, []);

  const fetchResearchData = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockBehavior = {
        timePatterns: {
          averageTimePerQuestion: 145,
          timeByDifficulty: {
            easy: 90,
            medium: 150,
            hard: 210,
          },
          timeByTopic: {
            Arrays: 120,
            'Dynamic Programming': 180,
            Trees: 140,
            Graphs: 165,
          },
        },
        cognitiveLoad: {
          currentLoad: 'optimal',
          loadHistory: [
            { timestamp: '2026-01-15', loadLevel: 'low' },
            { timestamp: '2026-01-16', loadLevel: 'optimal' },
            { timestamp: '2026-01-17', loadLevel: 'high' },
            { timestamp: '2026-01-18', loadLevel: 'optimal' },
          ],
        },
        learningVelocity: {
          questionsPerDay: 12,
          accuracyTrend: 'improving',
          velocityScore: 78,
        },
      };

      const mockSkillMastery = {
        Arrays: { masteryProbability: 0.82, confidence: 0.9, questionsAttempted: 45 },
        Strings: { masteryProbability: 0.75, confidence: 0.85, questionsAttempted: 38 },
        'Dynamic Programming': { masteryProbability: 0.61, confidence: 0.7, questionsAttempted: 28 },
        Trees: { masteryProbability: 0.88, confidence: 0.95, questionsAttempted: 52 },
        Graphs: { masteryProbability: 0.68, confidence: 0.75, questionsAttempted: 31 },
        'System Design': { masteryProbability: 0.72, confidence: 0.8, questionsAttempted: 40 },
      };

      const mockLongitudinal = {
        weeklyProgress: [
          { week: 'Week 1', questionsCompleted: 42, averageAccuracy: 65 },
          { week: 'Week 2', questionsCompleted: 58, averageAccuracy: 71 },
          { week: 'Week 3', questionsCompleted: 67, averageAccuracy: 76 },
          { week: 'Week 4', questionsCompleted: 74, averageAccuracy: 82 },
        ],
        projectedReadinessDate: '2026-02-15',
      };

      setLearningBehavior(mockBehavior);
      setSkillMastery(mockSkillMastery);
      setLongitudinalProgress(mockLongitudinal);
      setCognitiveLoad(mockBehavior.cognitiveLoad.currentLoad);
    } catch (error) {
      console.error('Error fetching research data:', error);
      toast.error('Failed to load research data');
    }
  };

  const exportData = async () => {
    toast.loading('Exporting data...');
    
    // Simulate export
    setTimeout(() => {
      const data = {
        learningBehavior,
        skillMastery,
        longitudinalProgress,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-data-${Date.now()}.json`;
      a.click();

      toast.dismiss();
      toast.success('Data exported successfully');
    }, 1500);
  };

  if (!learningBehavior) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading research data...</p>
        </div>
      </div>
    );
  }

  const masteryData = Object.entries(skillMastery).map(([topic, data]) => ({
    topic,
    mastery: Math.round(data.masteryProbability * 100),
    confidence: Math.round(data.confidence * 100),
    questions: data.questionsAttempted,
  }));

  const cognitiveLoadColors = {
    low: 'text-green-400 bg-green-500/20 border-green-500/50',
    optimal: 'text-blue-400 bg-blue-500/20 border-blue-500/50',
    high: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50',
    overload: 'text-red-400 bg-red-500/20 border-red-500/50',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] pt-24 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-5xl font-bold mb-2 text-navy-900 dark:text-white">Research Dashboard</h1>
              <p className="text-xl text-gray-400">
                Advanced learning analytics & educational data mining
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportData}
              className="flex items-center gap-2 px-6 py-3 bg-royal-600 rounded-xl font-semibold hover:bg-royal-700"
            >
              <Download className="w-5 h-5" />
              Export Data
            </motion.button>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Learning Velocity */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-royal-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className={`text-xs px-3 py-1 rounded-full ${
                learningBehavior.learningVelocity.accuracyTrend === 'improving' 
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {learningBehavior.learningVelocity.accuracyTrend}
              </span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{learningBehavior.learningVelocity.questionsPerDay}</h3>
            <p className="text-sm text-gray-400">Questions/Day</p>
            <div className="mt-4 h-2 bg-surface-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-royal-600"
                style={{ width: `${learningBehavior.learningVelocity.velocityScore}%` }}
              />
            </div>
          </motion.div>

          {/* Cognitive Load */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className={`text-xs px-3 py-1 rounded-full border capitalize ${cognitiveLoadColors[cognitiveLoad]}`}>
                {cognitiveLoad}
              </span>
            </div>
            <h3 className="text-2xl font-bold mb-1">Cognitive Load</h3>
            <p className="text-sm text-gray-400">Current State</p>
            <p className="text-xs text-gray-500 mt-2">
              {cognitiveLoad === 'optimal' && '✓ Performing at your best'}
              {cognitiveLoad === 'high' && '⚠️ Consider a short break'}
              {cognitiveLoad === 'overload' && '🛑 Take a break recommended'}
              {cognitiveLoad === 'low' && '💪 Ready for challenges'}
            </p>
          </motion.div>

          {/* Average Time */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">
              {Math.floor(learningBehavior.timePatterns.averageTimePerQuestion / 60)}:{(learningBehavior.timePatterns.averageTimePerQuestion % 60).toString().padStart(2, '0')}
            </h3>
            <p className="text-sm text-gray-400">Avg Time/Question</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Easy</span>
                <span className="text-green-400">{Math.floor(learningBehavior.timePatterns.timeByDifficulty.easy / 60)}m</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Medium</span>
                <span className="text-yellow-400">{Math.floor(learningBehavior.timePatterns.timeByDifficulty.medium / 60)}m</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Hard</span>
                <span className="text-red-400">{Math.floor(learningBehavior.timePatterns.timeByDifficulty.hard / 60)}m</span>
              </div>
            </div>
          </motion.div>

          {/* Readiness Projection */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">Feb 15, 2026</h3>
            <p className="text-sm text-gray-400">Projected Readiness</p>
            <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
              <Calendar className="w-3 h-3" />
              <span>27 days remaining</span>
            </div>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Skill Mastery Chart */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Award className="w-6 h-6 text-yellow-400" />
              Skill Mastery Estimation
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Bayesian-inspired probability model based on accuracy, speed, and consistency
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={masteryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="topic" stroke="#9ca3af" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="mastery" fill="url(#masteryGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="masteryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              {masteryData.slice(0, 3).map((item) => (
                <div key={item.topic} className="p-3 bg-white/5 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">{item.topic}</p>
                  <p className="text-lg font-bold text-blue-400">{item.mastery}%</p>
                  <p className="text-xs text-gray-500">{item.questions} qs</p>
                </div>
              ))}
            </div>
          </div>

          {/* Longitudinal Progress */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-400" />
              Longitudinal Progress
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Weekly performance tracking with accuracy trend analysis
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={longitudinalProgress.weeklyProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="week" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="questionsCompleted" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  name="Questions"
                />
                <Line 
                  type="monotone" 
                  dataKey="averageAccuracy" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  name="Accuracy %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Research Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Educational Data Mining */}
          <div className="glass rounded-2xl p-6">
            <div className="w-12 h-12 bg-royal-600 rounded-xl flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Educational Data Mining</h3>
            <p className="text-sm text-gray-400 mb-4">
              Time per question, reattempt patterns, cognitive fatigue signals, learner profile building
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Reattempt Rate</span>
                <span className="text-blue-400">18%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Fatigue Sessions</span>
                <span className="text-yellow-400">3/week</span>
              </div>
            </div>
          </div>

          {/* Question Calibration */}
          <div className="glass rounded-2xl p-6">
            <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Difficulty Calibration</h3>
            <p className="text-sm text-gray-400 mb-4">
              Automatic re-labeling of questions as Easy/Medium/Hard based on real user performance
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">124 questions recalibrated</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-300">18 pending review</span>
              </div>
            </div>
          </div>

          {/* NLP Analysis */}
          <div className="glass rounded-2xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">NLP Transcript Analysis</h3>
            <p className="text-sm text-gray-400 mb-4">
              Interview transcript analysis for keyword richness, structure quality, and redundancy detection
            </p>
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/30 text-xs text-blue-300">
              📊 Available for completed video interviews
            </div>
          </div>
        </div>

        {/* Research Notes */}
        <div className="mt-8 glass rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            📚 Research Impact
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-300">
            <div>
              <h4 className="font-semibold text-white mb-2">Publications Ready</h4>
              <ul className="space-y-2 list-disc list-inside">
                <li>Item Response Theory (IRT) inspired adaptive testing</li>
                <li>Cognitive load detection without invasive tracking</li>
                <li>Educational Data Mining (EDM) for learning science</li>
                <li>Explainable AI (XAI) for assessment feedback</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Data Ethics</h4>
              <ul className="space-y-2 list-disc list-inside">
                <li>All exported data is anonymized</li>
                <li>No personally identifiable information (PII) included</li>
                <li>GDPR compliant data handling</li>
                <li>User consent for research data usage</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchDashboard;
