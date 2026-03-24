import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
  FileText,
  Bot,
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '../store/authStore';
import { useTracking } from '../contexts/TrackingContext';
import { interviewAPI } from '../services/api';
import { loadHistory as loadMockHistory } from '../services/mockInterviewAI';

gsap.registerPlugin(ScrollTrigger);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { trackPageView, metrics, refreshMetrics } = useTracking();
  const statsRef = useRef(null);
  const cardsRef = useRef(null);
  const [streak, setStreak] = useState(7);
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [mockHistory, setMockHistory] = useState([]);
  const [mockHistoryLoading, setMockHistoryLoading] = useState(false);

  // Track page view and refresh metrics
  useEffect(() => {
    trackPageView('/dashboard');
    refreshMetrics();
  }, [trackPageView, refreshMetrics]);

  // Fetch interview history
  useEffect(() => {
    const userId = user?._id || user?.id;
    if (!userId) return;
    setHistoryLoading(true);
    interviewAPI
      .getHistory(userId)
      .then((res) => {
        const items = res.data?.data || res.data?.history || [];
        setInterviewHistory(items.slice(0, 5)); // show latest 5
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [user]);

  // Fetch mock AI interview history
  useEffect(() => {
    if (!user?._id && !user?.id) return;
    setMockHistoryLoading(true);
    loadMockHistory()
      .then((data) => setMockHistory(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => {})
      .finally(() => setMockHistoryLoading(false));
  }, [user]);

  // Update streak from metrics
  useEffect(() => {
    if (metrics?.dailyStreak) {
      setStreak(metrics.dailyStreak);
    }
  }, [metrics]);

  useEffect(() => {
    // Animate stats on mount
    const stats = document.querySelectorAll('.stat-value');
    stats.forEach((stat, index) => {
      const target = parseInt(stat.getAttribute('data-value'));
      gsap.from(stat, {
        textContent: 0,
        duration: 2,
        delay: index * 0.1,
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

    // Stagger animation for cards
    const cards = document.querySelectorAll('.dashboard-card');
    gsap.fromTo(cards, 
      { 
        opacity: 0, 
        y: 60,
        scale: 0.95,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: cardsRef.current,
          start: 'top 80%',
        },
      }
    );

    // Floating animation for icons
    gsap.to('.float-icon', {
      y: -8,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: 0.2,
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
      value: metrics?.problemsSolved || 248,
      change: '+12%',
      color: 'bg-royal-600',
    },
    {
      icon: TrendingUp,
      label: 'Accuracy Rate',
      value: Math.round(metrics?.successRate) || 88,
      suffix: '%',
      change: '+5%',
      color: 'bg-success-600',
    },
    {
      icon: Clock,
      label: 'Study Hours',
      value: Math.floor((metrics?.totalTimeSpent || 0) / 3600) || 51,
      suffix: 'h',
      change: '+8h',
      color: 'bg-navy-700',
    },
    {
      icon: Award,
      label: 'Mock Interviews',
      value: metrics?.mockInterviewsCompleted || 12,
      change: '+3',
      color: 'bg-royal-700',
    },
  ];

  const quickActions = [
    {
      title: 'Continue Learning',
      description: 'Dynamic Programming - Day 3',
      icon: Brain,
      path: '/practice',
      gradient: 'bg-royal-600',
    },
    {
      title: 'Mock Interview',
      description: 'Take a timed interview',
      icon: Target,
      path: '/mock-interview',
      gradient: 'bg-navy-700',
    },
    {
      title: 'Code Playground',
      description: 'Practice coding challenges',
      icon: Code,
      path: '/code-playground',
      gradient: 'bg-royal-700',
    },
    {
      title: 'View Analytics',
      description: 'Deep dive into your progress',
      icon: BarChart3,
      path: '/analytics',
      gradient: 'bg-navy-800',
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
            className="text-4xl md:text-5xl font-bold mb-4 text-navy-900 dark:text-white"
          >
            Welcome back, <span className="text-royal-600">{user?.name}! 👋</span>
          </motion.h1>
          <p className="text-surface-600 dark:text-surface-400 text-lg">
            Here's your learning progress overview
          </p>
        </div>

        {/* Streak Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-2xl p-6 mb-8 relative overflow-hidden border border-surface-200 dark:border-surface-700"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-warning-500/5 to-warning-600/5"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="streak-fire text-5xl">🔥</div>
              <div>
                <h3 className="text-2xl font-bold text-navy-900 dark:text-white">{streak} Day Streak!</h3>
                <p className="text-surface-600 dark:text-surface-400">Keep the momentum going!</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-royal-600">{streak * 10}</div>
              <p className="text-sm text-surface-500 dark:text-surface-400">XP Earned</p>
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
              className="glass-strong rounded-2xl p-6 hover:scale-105 transition-transform cursor-pointer group border border-surface-200 dark:border-surface-700"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-soft-md`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-success-600 text-sm font-medium">{stat.change}</span>
              </div>
              <p className="text-surface-500 dark:text-surface-400 text-sm mb-2">{stat.label}</p>
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
            className="glass-strong rounded-2xl p-6 border border-surface-200 dark:border-surface-700"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center text-navy-900 dark:text-white">
              <TrendingUp className="w-5 h-5 mr-2 text-success-600" />
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
            className="glass-strong rounded-2xl p-6 border border-surface-200 dark:border-surface-700"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center text-navy-900 dark:text-white">
              <Clock className="w-5 h-5 mr-2 text-royal-500" />
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
                    <stop offset="100%" stopColor="#1e3a8a" stopOpacity={1} />
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
          className="glass-strong rounded-2xl p-6 mb-8 border border-surface-200 dark:border-surface-700"
        >
          <h3 className="text-xl font-semibold mb-6 flex items-center text-navy-900 dark:text-white">
            <BarChart3 className="w-5 h-5 mr-2 text-royal-600" />
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
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-2xl font-semibold mb-4 text-navy-900 dark:text-white">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.path}
                  className="glass-strong rounded-xl p-6 hover:scale-105 transition-all duration-300 group cursor-pointer border border-surface-200 dark:border-surface-700"
                >
                  <div className={`w-12 h-12 rounded-lg ${action.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-soft-md`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2 text-navy-900 dark:text-white group-hover:text-royal-600 dark:group-hover:text-royal-400 transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-surface-500 dark:text-surface-400 text-sm mb-3">{action.description}</p>
                  <div className="flex items-center text-royal-600 dark:text-royal-400 text-sm font-medium">
                    <span>Get Started</span>
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-2xl font-semibold mb-4 text-navy-900 dark:text-white">Recent Activity</h3>
            <div className="glass-strong rounded-xl p-6 space-y-4 border border-surface-200 dark:border-surface-700">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 pb-4 border-b border-surface-200 dark:border-surface-700 last:border-0 last:pb-0"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'success' ? 'bg-success-500' : activity.type === 'info' ? 'bg-royal-500' : 'bg-surface-400'
                    }`}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy-900 dark:text-white">{activity.title}</p>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Interview History */}
        {(historyLoading || interviewHistory.length > 0) && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-navy-900 dark:text-white">Interview History</h3>
              <Link to="/interviews" className="text-royal-600 dark:text-royal-400 text-sm font-medium hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {historyLoading ? (
              <div className="text-center py-8 text-surface-500 dark:text-surface-400">Loading history...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {interviewHistory.map((item, idx) => {
                  const score = item.overallScore ?? null;
                  const grade = score === null ? '—' : score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
                  const gradeColor = grade === 'A' ? 'text-green-600' : grade === 'B' ? 'text-blue-600' : grade === 'C' ? 'text-yellow-600' : 'text-red-600';
                  const reportPath = item.reportId
                    ? `/interview/report/${item.reportId}`
                    : item.interviewId
                    ? `/interview/${item.interviewId}/report`
                    : null;
                  return (
                    <motion.div
                      key={item.interviewId || idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="glass-strong rounded-xl p-5 border border-surface-200 dark:border-surface-700 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-royal-600 dark:text-royal-400 bg-royal-50 dark:bg-royal-900/30 px-2 py-0.5 rounded">
                          {item.type || 'Interview'}
                        </span>
                        <span className={`text-2xl font-bold ${gradeColor}`}>{grade}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-navy-900 dark:text-white">{item.role || item.targetRole || 'General Interview'}</p>
                        {item.readinessLabel && (
                          <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{item.readinessLabel}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {item.date ? new Date(item.date).toLocaleDateString() : '—'}
                        </span>
                        {score !== null && <span className="font-semibold text-navy-900 dark:text-white">{score}/100</span>}
                      </div>
                      {reportPath && (
                        <button
                          onClick={() => navigate(reportPath)}
                          className="mt-1 flex items-center gap-1 text-xs text-royal-600 dark:text-royal-400 hover:underline self-start"
                        >
                          <FileText className="w-3 h-3" /> View Report
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Mock AI Interview History */}
        {(mockHistoryLoading || mockHistory.length > 0) && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                <Bot className="w-6 h-6 text-indigo-500" /> AI Mock Interviews
              </h3>
              <button
                onClick={() => navigate('/mock-interview/history')}
                className="text-royal-600 dark:text-royal-400 text-sm font-medium hover:underline flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {mockHistoryLoading ? (
              <div className="text-center py-8 text-surface-500 dark:text-surface-400">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {mockHistory.map((report, idx) => {
                  const g = !report.overallScore ? '—'
                    : report.overallScore >= 85 ? 'A'
                    : report.overallScore >= 70 ? 'B'
                    : report.overallScore >= 55 ? 'C'
                    : report.overallScore >= 40 ? 'D' : 'F';
                  const gc = g === 'A' ? 'text-green-500' : g === 'B' ? 'text-blue-500' : g === 'C' ? 'text-yellow-500' : 'text-red-500';
                  return (
                    <motion.div
                      key={report._id || idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="glass-strong rounded-xl p-4 border border-surface-200 dark:border-surface-700 flex flex-col gap-2 cursor-pointer hover:border-indigo-400 transition"
                      onClick={() => navigate(`/mock-interview/${report.mockInterviewId}/report`)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                          {report.interviewType || 'AI Mock'}
                        </span>
                        <span className={`text-2xl font-black ${gc}`}>{g}</span>
                      </div>
                      <p className="text-sm font-medium text-navy-900 dark:text-white truncate">
                        {report.targetRole || 'Interview'}
                      </p>
                      <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                        {report.overallScore != null && (
                          <span className="font-semibold text-navy-900 dark:text-white">{report.overallScore}/100</span>
                        )}
                      </div>
                      <span className="text-xs text-indigo-500 flex items-center gap-1 mt-1">
                        <FileText className="w-3 h-3" /> View Report
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
