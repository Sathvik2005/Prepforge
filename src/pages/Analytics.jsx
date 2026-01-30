import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { TrendingUp, Target, Clock, Award, Calendar, BookOpen } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Analytics = () => {
  const statsRef = useRef(null);

  useEffect(() => {
    const stats = document.querySelectorAll('.analytics-stat');
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
  }, []);

  const weeklyProgress = [
    { week: 'Week 1', solved: 15, accuracy: 65 },
    { week: 'Week 2', solved: 28, accuracy: 72 },
    { week: 'Week 3', solved: 42, accuracy: 78 },
    { week: 'Week 4', solved: 58, accuracy: 85 },
  ];

  const topicAccuracy = [
    { topic: 'Arrays', accuracy: 92 },
    { topic: 'Strings', accuracy: 88 },
    { topic: 'Trees', accuracy: 76 },
    { topic: 'Graphs', accuracy: 68 },
    { topic: 'DP', accuracy: 72 },
    { topic: 'Greedy', accuracy: 84 },
  ];

  const timeDistribution = [
    { name: 'DSA', value: 35, color: '#3b82f6' },
    { name: 'System Design', value: 20, color: '#8b5cf6' },
    { name: 'Frontend', value: 25, color: '#10b981' },
    { name: 'Backend', value: 20, color: '#f59e0b' },
  ];

  const dailyActivity = [
    { day: 'Mon', hours: 3 },
    { day: 'Tue', hours: 4 },
    { day: 'Wed', hours: 2 },
    { day: 'Thu', hours: 5 },
    { day: 'Fri', hours: 3 },
    { day: 'Sat', hours: 6 },
    { day: 'Sun', hours: 4 },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-bold mb-4">
            <span className="gradient-text">Analytics Dashboard</span>
          </h1>
          <p className="text-xl text-gray-400">
            Deep insights into your preparation journey
          </p>
        </motion.div>

        {/* Key Metrics */}
        <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { icon: Target, label: 'Total Solved', value: 248, color: 'from-blue-500 to-cyan-500' },
            { icon: TrendingUp, label: 'Accuracy', value: 85, suffix: '%', color: 'from-green-500 to-emerald-500' },
            { icon: Clock, label: 'Study Hours', value: 127, suffix: 'h', color: 'from-purple-500 to-pink-500' },
            { icon: Award, label: 'Streak Days', value: 15, color: 'from-orange-500 to-red-500' },
          ].map((metric, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-strong rounded-2xl p-6"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center mb-4`}>
                <metric.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-400 text-sm mb-2">{metric.label}</p>
              <div className="flex items-baseline">
                <span className="text-4xl font-bold analytics-stat" data-value={metric.value}>0</span>
                {metric.suffix && <span className="text-xl ml-1">{metric.suffix}</span>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Weekly Progress */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-strong rounded-2xl p-6"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-400" />
              Weekly Progress
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklyProgress}>
                <defs>
                  <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area type="monotone" dataKey="solved" stroke="#3b82f6" fillOpacity={1} fill="url(#progressGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Topic-wise Accuracy */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-strong rounded-2xl p-6"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <Target className="w-5 h-5 mr-2 text-green-400" />
              Topic-wise Accuracy
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topicAccuracy} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="topic" type="category" stroke="#9ca3af" width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="accuracy" fill="url(#barGradient2)" radius={[0, 8, 8, 0]} />
                <defs>
                  <linearGradient id="barGradient2" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={1} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Second Row Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Time Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-2xl p-6"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-purple-400" />
              Time Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={timeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {timeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {timeDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                    <span className="text-gray-300">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Daily Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 glass-strong rounded-2xl p-6"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-orange-400" />
              Daily Activity (This Week)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyActivity}>
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
                <Bar dataKey="hours" fill="url(#dailyGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={1} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
