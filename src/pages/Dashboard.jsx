import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Target,
  Clock,
  Award,
  Flame,
  Brain,
  Code,
  BarChart3,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '@/store/authStore';

const Dashboard = () => {
  const { user } = useAuthStore();
  const statsRef = useRef(null);
  const [streak, setStreak] = useState(7);

  useEffect(() => {
    // Animate stats on mount
    const stats = document.querySelectorAll('.stat-value');
    stats.forEach((stat) => {
      const target = parseInt(stat.getAttribute('data-value'));
      gsap.from(stat, {
        textContent: 0,
        duration: 2,
        ease: 'power2.out',
        snap: { textContent: 1 },
        onUpdate: function () {
          stat.textContent = Math.ceil(this.targets()[0].textContent);
        },
      });
    });

    // Streak fire animation
    gsap.to('.streak-fire', {
      scale: 1.2,
      opacity: 0.8,
      duration: 0.5,
      yoyo: true,
      repeat: -1,
      ease: 'power1.inOut',
    });
  }, []);

  const accuracyData = [
    { day: 'Mon', accuracy: 65 },
    { day: 'Tue', accuracy: 72 },
    { day: 'Wed', accuracy: 68 },
    { day: 'Thu', accuracy: 78 },
    { day: 'Fri', accuracy: 82 },
    { day: 'Sat', accuracy: 85 },
    { day: 'Sun', accuracy: 88 },
  ];

  const timeSpentData = [
    { topic: 'DSA', hours: 12 },
    { topic: 'System Design', hours: 8 },
    { topic: 'JavaScript', hours: 15 },
    { topic: 'React', hours: 10 },
    { topic: 'Databases', hours: 6 },
  ];

  const progressData = [
    { week: 'Week 1', solved: 20 },
    { week: 'Week 2', solved: 35 },
    { week: 'Week 3', solved: 48 },
    { week: 'Week 4', solved: 62 },
  ];

  const stats = [
    {
      icon: Target,
      label: 'Questions Solved',
      value: 248,
      change: '+12%',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: TrendingUp,
      label: 'Accuracy Rate',
      value: 88,
      suffix: '%',
      change: '+5%',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Clock,
      label: 'Study Hours',
      value: 51,
      suffix: 'h',
      change: '+8h',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Award,
      label: 'Mock Interviews',
      value: 12,
      change: '+3',
      color: 'from-orange-500 to-red-500',
    },
  ];

  const quickActions = [
    {
      title: 'Continue Learning',
      description: 'Dynamic Programming - Day 3',
      icon: Brain,
      path: '/practice',
      gradient: 'from-blue-500 to-purple-500',
    },
    {
      title: 'Mock Interview',
      description: 'Take a timed interview',
      icon: Target,
      path: '/mock-interview',
      gradient: 'from-green-500 to-cyan-500',
    },
    {
      title: 'Code Playground',
      description: 'Practice coding challenges',
      icon: Code,
      path: '/code-playground',
      gradient: 'from-orange-500 to-red-500',
    },
    {
      title: 'View Analytics',
      description: 'Deep dive into your progress',
      icon: BarChart3,
      path: '/analytics',
      gradient: 'from-purple-500 to-pink-500',
    },
  ];

  const recentActivity = [
    { title: 'Completed "Two Sum" problem', time: '2 hours ago', type: 'success' },
    { title: 'Mock Interview - Frontend Round', time: '1 day ago', type: 'info' },
    { title: 'Reviewed System Design concepts', time: '2 days ago', type: 'default' },
    { title: 'Streak milestone reached!', time: '3 days ago', type: 'success' },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Welcome back, <span className="gradient-text">{user?.name}! 👋</span>
          </motion.h1>
          <p className="text-gray-400 text-lg">
            Here's your learning progress overview
          </p>
        </div>

        {/* Streak Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-2xl p-6 mb-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="streak-fire text-5xl">🔥</div>
              <div>
                <h3 className="text-2xl font-bold">{streak} Day Streak!</h3>
                <p className="text-gray-400">Keep the momentum going!</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold gradient-text">{streak * 10}</div>
              <p className="text-sm text-gray-400">XP Earned</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-strong rounded-2xl p-6 hover:scale-105 transition-transform cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-green-400 text-sm font-medium">{stat.change}</span>
              </div>
              <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold stat-value" data-value={stat.value}>
                  0
                </span>
                {stat.suffix && <span className="text-xl ml-1">{stat.suffix}</span>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Accuracy Trend */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-strong rounded-2xl p-6"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
              Accuracy Trend
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={accuracyData}>
                <defs>
                  <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#accuracyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Time Spent by Topic */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-strong rounded-2xl p-6"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-400" />
              Time Spent by Topic
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timeSpentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="topic" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="hours" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Progress Over Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-2xl p-6 mb-8"
        >
          <h3 className="text-xl font-semibold mb-6 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-purple-400" />
            Questions Solved Progress
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="week" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="solved"
                stroke="#a78bfa"
                strokeWidth={3}
                dot={{ fill: '#a78bfa', r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-2xl font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.path}
                  className="glass-strong rounded-xl p-6 hover:scale-105 transition-all duration-300 group cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-gray-400 text-sm mb-3">{action.description}</p>
                  <div className="flex items-center text-blue-400 text-sm font-medium">
                    <span>Get Started</span>
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-2xl font-semibold mb-4">Recent Activity</h3>
            <div className="glass-strong rounded-xl p-6 space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 pb-4 border-b border-white/10 last:border-0 last:pb-0"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'success' ? 'bg-green-400' : activity.type === 'info' ? 'bg-blue-400' : 'bg-gray-400'
                    }`}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
