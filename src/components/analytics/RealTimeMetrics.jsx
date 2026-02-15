import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, TrendingUp, Clock, Award, Target, Code, 
  BookOpen, Brain, Trophy, Zap, Calendar, CheckCircle 
} from 'lucide-react';
import { useTracking } from '../../contexts/TrackingContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const RealTimeMetrics = () => {
  const { metrics, isConnected } = useTracking();
  const [performanceData, setPerformanceData] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [difficultyData, setDifficultyData] = useState([]);

  useEffect(() => {
    if (metrics) {
      // Format performance trend data
      if (metrics.performanceTrend) {
        const trendData = metrics.performanceTrend.map(trend => ({
          date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          score: trend.averageScore,
          solved: trend.problemsSolved,
          accuracy: trend.successRate
        }));
        setPerformanceData(trendData);
      }

      // Format activity distribution
      if (metrics.totalActivities) {
        const activities = [
          { name: 'Questions Solved', value: metrics.problemsSolved?.total || 0, color: '#10b981' },
          { name: 'Code Runs', value: metrics.codeExecutions || 0, color: '#3b82f6' },
          { name: 'Interviews', value: metrics.mockInterviews || 0, color: '#8b5cf6' },
          { name: 'Roadmaps', value: metrics.roadmapsGenerated || 0, color: '#f59e0b' },
          { name: 'Focus Time', value: Math.floor((metrics.focusTimeMinutes || 0) / 30), color: '#ec4899' }
        ].filter(item => item.value > 0);
        setActivityData(activities);
      }

      // Format difficulty distribution
      if (metrics.problemsSolved) {
        const difficulties = [
          { name: 'Easy', value: metrics.problemsSolved.easy || 0, color: '#10b981' },
          { name: 'Medium', value: metrics.problemsSolved.medium || 0, color: '#f59e0b' },
          { name: 'Hard', value: metrics.problemsSolved.hard || 0, color: '#ef4444' }
        ].filter(item => item.value > 0);
        setDifficultyData(difficulties);
      }
    }
  }, [metrics]);

  if (!metrics) {
    return (
      <div className="glass-strong rounded-2xl p-8 text-center">
        <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
        <p className="text-gray-400">Loading your real-time metrics...</p>
      </div>
    );
  }

  const keyMetrics = [
    {
      icon: Target,
      label: 'Total Activities',
      value: metrics.totalActivities || 0,
      color: 'bg-royal-600',
      trend: '+12% from last week'
    },
    {
      icon: CheckCircle,
      label: 'Problems Solved',
      value: metrics.problemsSolved?.total || 0,
      color: 'bg-success-600',
      trend: `${metrics.problemsSolved?.easy || 0}E, ${metrics.problemsSolved?.medium || 0}M, ${metrics.problemsSolved?.hard || 0}H`
    },
    {
      icon: TrendingUp,
      label: 'Success Rate',
      value: `${(metrics.successRate || 0).toFixed(1)}%`,
      color: 'bg-navy-700',
      trend: metrics.successRate >= 80 ? 'Excellent!' : 'Keep improving'
    },
    {
      icon: Award,
      label: 'Current Streak',
      value: `${metrics.currentStreak || 0} days`,
      color: 'bg-warning-600',
      trend: `Best: ${metrics.longestStreak || 0} days`
    },
    {
      icon: Clock,
      label: 'Time Invested',
      value: `${Math.floor((metrics.totalTimeSpent || 0) / 60)}h ${(metrics.totalTimeSpent || 0) % 60}m`,
      color: 'bg-purple-600',
      trend: `Focus: ${Math.floor((metrics.focusTimeMinutes || 0) / 60)}h`
    },
    {
      icon: Code,
      label: 'Code Executions',
      value: metrics.codeExecutions || 0,
      color: 'bg-blue-600',
      trend: 'Practice makes perfect'
    },
    {
      icon: Brain,
      label: 'Mock Interviews',
      value: metrics.mockInterviews || 0,
      color: 'bg-indigo-600',
      trend: 'Interview ready'
    },
    {
      icon: BookOpen,
      label: 'Roadmaps Created',
      value: metrics.roadmapsGenerated || 0,
      color: 'bg-pink-600',
      trend: 'Strategic learner'
    }
  ];

  const skillLevels = metrics.skillLevels || {};
  const topSkills = Object.entries(skillLevels)
    .map(([skill, level]) => ({ skill, level }))
    .sort((a, b) => b.level - a.level)
    .slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Connection Status */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between glass-strong rounded-xl p-4"
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-sm font-medium">
            {isConnected ? 'Real-time Tracking Active' : 'Reconnecting...'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Zap className="w-4 h-4" />
          <span>Live Updates</span>
        </div>
      </motion.div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-strong rounded-2xl p-6 hover:scale-105 transition-transform duration-300"
          >
            <div className={`w-12 h-12 rounded-xl ${metric.color} flex items-center justify-center mb-4`}>
              <metric.icon className="w-6 h-6 text-white" />
            </div>
            <p className="text-gray-400 text-sm mb-2">{metric.label}</p>
            <div className="flex items-baseline mb-2">
              <span className="text-3xl font-bold text-white">{metric.value}</span>
            </div>
            <p className="text-xs text-gray-500">{metric.trend}</p>
          </motion.div>
        ))}
      </div>

      {/* Performance Trend Chart */}
      {performanceData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-2xl p-6"
        >
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-royal-600" />
            Performance Trend (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '12px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }}
                name="Performance Score"
              />
              <Line 
                type="monotone" 
                dataKey="accuracy" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 5 }}
                name="Accuracy %"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Distribution */}
        {activityData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-strong rounded-2xl p-6"
          >
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Activity className="w-6 h-6 text-purple-600" />
              Activity Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={activityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {activityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid #334155',
                    borderRadius: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Difficulty Distribution */}
        {difficultyData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-strong rounded-2xl p-6"
          >
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-600" />
              Problems by Difficulty
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={difficultyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid #334155',
                    borderRadius: '12px'
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {difficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>

      {/* Skill Levels */}
      {topSkills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-2xl p-6"
        >
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-600" />
            Top Skills & Mastery Levels
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topSkills.map((skill, index) => (
              <div key={index} className="bg-surface-800/50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold capitalize">{skill.skill}</span>
                  <span className="text-sm text-royal-400">Lvl {skill.level}</span>
                </div>
                <div className="w-full bg-surface-700 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(skill.level * 10, 100)}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    className="bg-gradient-to-r from-royal-600 to-purple-600 h-2 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Achievements */}
      {metrics.performanceTrend && metrics.performanceTrend.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-2xl p-6"
        >
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-green-600" />
            Recent Activity Summary
          </h3>
          <div className="space-y-3">
            {metrics.performanceTrend.slice(-7).reverse().map((day, index) => (
              <div key={index} className="flex items-center justify-between bg-surface-800/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-royal-600/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-royal-400" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-gray-400">
                      {day.problemsSolved} problems solved • {day.successRate.toFixed(0)}% accuracy
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-royal-400">{day.averageScore.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">score</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default RealTimeMetrics;
