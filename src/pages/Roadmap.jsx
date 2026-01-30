import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Calendar,
  Target,
  Sparkles,
  CheckCircle2,
  Circle,
  Lock,
  TrendingUp,
  Brain,
  Zap,
  Clock,
  Award,
  BarChart3,
  BookOpen,
  Play,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { aiAPI } from '../services/api';

gsap.registerPlugin(ScrollTrigger);

const Roadmap = () => {
  const [formData, setFormData] = useState({
    targetRole: '',
    targetDate: '',
    weeklyHours: 20,
    experienceLevel: 'intermediate',
    focusAreas: [],
  });
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [todayPlan, setTodayPlan] = useState(null);
  const [completedDays, setCompletedDays] = useState(new Set());
  const timelineRef = useRef(null);

  // Load existing roadmap on mount
  useEffect(() => {
    loadCurrentRoadmap();
  }, []);

  useEffect(() => {
    if (roadmap && timelineRef.current) {
      // Animate timeline items
      const items = gsap.utils.toArray('.timeline-item');
      items.forEach((item, index) => {
        gsap.from(item, {
          scrollTrigger: {
            trigger: item,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
          x: index % 2 === 0 ? -100 : 100,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
        });
      });
    }
  }, [roadmap]);

  const loadCurrentRoadmap = async () => {
    try {
      const response = await aiAPI.getCurrentRoadmap();
      setRoadmap(response.data.roadmap);
      
      // Load today's plan
      const todayResponse = await aiAPI.getTodayPlan();
      setTodayPlan(todayResponse.data.dayPlan);
      
      // Track completed days
      const completed = new Set();
      response.data.roadmap.roadmap.dailyPlans.forEach((day) => {
        if (day.isCompleted) completed.add(day.day);
      });
      setCompletedDays(completed);
    } catch (error) {
      // No active roadmap found - that's okay
      console.log('No active roadmap');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await aiAPI.generateRoadmap({
        targetRole: formData.targetRole,
        targetDate: formData.targetDate,
        weeklyHours: parseInt(formData.weeklyHours),
        experienceLevel: formData.experienceLevel,
        focusAreas: formData.focusAreas,
      });

      setRoadmap(response.data.roadmap);
      toast.success('🎉 Personalized roadmap generated successfully!');

      // Scroll to roadmap
      setTimeout(() => {
        timelineRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    } catch (error) {
      console.error('Roadmap generation error:', error);
      toast.error(
        error.response?.data?.message || 'Failed to generate roadmap'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDay = async (dayNumber) => {
    try {
      await aiAPI.completeDayPlan(dayNumber);
      setCompletedDays((prev) => new Set([...prev, dayNumber]));
      toast.success(`Day ${dayNumber} completed! 🎉`);
      
      // Reload roadmap to get updated progress
      await loadCurrentRoadmap();
    } catch (error) {
      toast.error('Failed to mark day as complete');
    }
  };

  const roleOptions = [
    'Frontend',
    'Backend',
    'FullStack',
    'ML/AI',
    'Data',
    'DevOps',
    'Cybersecurity',
    'Mobile',
    'QA',
  ];

  const topicOptions = [
    'Arrays',
    'Strings',
    'Linked List',
    'Stack',
    'Queue',
    'Trees',
    'Graph',
    'Dynamic Programming',
    'Recursion',
    'Backtracking',
    'Greedy',
    'Binary Search',
    'Hashing',
    'Sorting',
  ];

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'text-green-400 bg-green-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'hard':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusIcon = (day) => {
    if (completedDays.has(day.day)) {
      return <CheckCircle2 className="w-6 h-6 text-green-400" />;
    } else if (todayPlan?.day === day.day) {
      return <Zap className="w-6 h-6 text-yellow-400" />;
    } else {
      return <Lock className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="w-8 h-8 text-purple-400" />
            <h1 className="text-5xl font-bold gradient-text">
              AI Smart Roadmap Generator
            </h1>
            <Sparkles className="w-8 h-8 text-yellow-400" />
          </div>
          <p className="text-xl text-gray-400">
            Get a personalized daily learning plan powered by AI algorithms
          </p>
        </motion.div>

        {/* Today's Focus (if roadmap exists) */}
        {todayPlan && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-strong rounded-3xl p-8 mb-8 border-2 border-yellow-400/30"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Zap className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold">Today's Focus - Day {todayPlan.day}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayPlan.topics.map((topic, idx) => (
                <div key={idx} className="glass rounded-xl p-4">
                  <h3 className="font-semibold text-lg mb-2">{topic.name}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{topic.estimatedTime} mins</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(topic.difficulty)}`}>
                      {topic.difficulty}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1">
                    {topic.resources?.slice(0, 2).map((resource, i) => (
                      <a
                        key={i}
                        href={resource}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Resource {i + 1}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => handleCompleteDay(todayPlan.day)}
              className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 font-semibold transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Mark Day {todayPlan.day} as Complete</span>
            </button>
          </motion.div>
        )}

        {/* Form Section */}
        {!roadmap && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-3xl p-8 md:p-12 mb-12"
          >
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Target Role */}
              <div>
                <label className="block text-lg font-semibold mb-4">
                  What's your target role? 🎯
                </label>
                <select
                  value={formData.targetRole}
                  onChange={(e) =>
                    setFormData({ ...formData, targetRole: e.target.value })
                  }
                  required
                  className="w-full px-6 py-4 rounded-xl glass text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select your target role</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role} Developer
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Date */}
              <div>
                <label className="block text-lg font-semibold mb-4">
                  Target Interview Date 📅
                </label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) =>
                    setFormData({ ...formData, targetDate: e.target.value })
                  }
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-6 py-4 rounded-xl glass text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Weekly Hours */}
              <div>
                <label className="block text-lg font-semibold mb-4">
                  Weekly Study Hours ⏰ ({formData.weeklyHours}h/week)
                </label>
                <input
                  type="range"
                  min="5"
                  max="70"
                  step="5"
                  value={formData.weeklyHours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weeklyHours: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-400 mt-2">
                  <span>5h (Casual)</span>
                  <span>35h (Moderate)</span>
                  <span>70h (Intense)</span>
                </div>
              </div>

              {/* Experience Level */}
              <div>
                <label className="block text-lg font-semibold mb-4">
                  Current Experience Level 📊
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {['beginner', 'intermediate', 'advanced'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, experienceLevel: level })
                      }
                      className={`py-4 rounded-xl font-medium transition-all ${
                        formData.experienceLevel === level
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 glow'
                          : 'glass hover:glass-strong'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus Areas */}
              <div>
                <label className="block text-lg font-semibold mb-4">
                  Focus Areas (Optional) 🎓
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {topicOptions.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => {
                        const current = formData.focusAreas;
                        if (current.includes(topic)) {
                          setFormData({
                            ...formData,
                            focusAreas: current.filter((t) => t !== topic),
                          });
                        } else {
                          setFormData({
                            ...formData,
                            focusAreas: [...current, topic],
                          });
                        }
                      }}
                      className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        formData.focusAreas.includes(topic)
                          ? 'bg-purple-500/30 border-2 border-purple-500'
                          : 'glass hover:glass-strong'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 font-semibold text-lg transition-all glow flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Generating Your Personalized Roadmap...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate AI Roadmap</span>
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        )}

        {/* Roadmap Display */}
        {roadmap && (
          <div ref={timelineRef}>
            {/* Stats Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-2xl p-8 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {roadmap.goals.targetRole} Developer Roadmap
                  </h2>
                  <p className="text-gray-400">
                    {roadmap.roadmap.totalDays} days plan •{' '}
                    {roadmap.roadmap.totalTopics} topics • Confidence:{' '}
                    {(roadmap.roadmap.confidence * 100).toFixed(0)}%
                  </p>
                </div>
                <button
                  onClick={() => {
                    setRoadmap(null);
                    setTodayPlan(null);
                  }}
                  className="px-6 py-2 rounded-lg glass hover:glass-strong transition-all"
                >
                  Generate New
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 rounded-xl glass">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-green-400">
                    {completedDays.size}
                  </div>
                  <div className="text-sm text-gray-400">Completed</div>
                </div>
                <div className="text-center p-4 rounded-xl glass">
                  <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-yellow-400">
                    {roadmap.adaptiveMetrics.currentDay}
                  </div>
                  <div className="text-sm text-gray-400">Current Day</div>
                </div>
                <div className="text-center p-4 rounded-xl glass">
                  <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-blue-400">
                    {roadmap.adaptiveMetrics.overallProgress.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-400">Progress</div>
                </div>
                <div className="text-center p-4 rounded-xl glass">
                  <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-purple-400">
                    {roadmap.adaptiveMetrics.adherenceScore.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-400">Adherence</div>
                </div>
              </div>
            </motion.div>

            {/* Timeline */}
            <div className="relative">
              {/* Center line */}
              <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-purple-500 via-blue-500 to-cyan-500 opacity-30"></div>

              {/* Timeline Items */}
              <div className="space-y-12">
                {roadmap.roadmap.dailyPlans.map((day, index) => (
                  <motion.div
                    key={index}
                    className={`timeline-item relative ${
                      index % 2 === 0 ? 'md:pr-1/2' : 'md:pl-1/2 md:ml-auto'
                    }`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div
                      className={`glass-strong rounded-2xl p-6 ${
                        completedDays.has(day.day)
                          ? 'border-2 border-green-400/50'
                          : todayPlan?.day === day.day
                          ? 'border-2 border-yellow-400/50'
                          : 'border border-white/10'
                      }`}
                    >
                      {/* Day badge */}
                      <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-6">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                            completedDays.has(day.day)
                              ? 'bg-green-400 text-black'
                              : todayPlan?.day === day.day
                              ? 'bg-yellow-400 text-black'
                              : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {getStatusIcon(day)}
                        </div>
                      </div>

                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xl font-semibold">
                            Day {day.day}
                          </h3>
                          <span className="text-sm text-gray-400">
                            {new Date(day.date).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="space-y-4">
                          {day.topics.map((topic, i) => (
                            <div
                              key={i}
                              className="glass rounded-xl p-4"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold">{topic.name}</h4>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(topic.difficulty)}`}
                                >
                                  {topic.difficulty}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-400">
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{topic.estimatedTime}min</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <BookOpen className="w-4 h-4" />
                                  <span>{topic.questionIds?.length || 0} questions</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {!completedDays.has(day.day) && todayPlan?.day === day.day && (
                          <button
                            onClick={() => handleCompleteDay(day.day)}
                            className="mt-4 w-full px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition-all text-sm font-medium flex items-center justify-center space-x-2"
                          >
                            <Play className="w-4 h-4" />
                            <span>Start Day {day.day}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Roadmap;
