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
      try {
        const todayResponse = await aiAPI.getTodayPlan();
        setTodayPlan(todayResponse.data.dayPlan);
      } catch (todayError) {
        console.log('No today plan available');
      }
      
      // Track completed days
      const completed = new Set();
      if (response.data.roadmap?.roadmap?.dailyPlans) {
        response.data.roadmap.roadmap.dailyPlans.forEach((day) => {
          if (day.isCompleted) completed.add(day.day);
        });
      }
      setCompletedDays(completed);
    } catch (error) {
      // No active roadmap found - that's okay
      if (error.response?.status === 404) {
        console.log('No active roadmap found - user needs to create one');
      } else {
        console.error('Error loading roadmap:', error);
        toast.error('Failed to load roadmap. Please try refreshing the page.');
      }
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
        return 'text-success-600 bg-success-100 dark:bg-success-900/30';
      case 'medium':
        return 'text-warning-600 bg-warning-100 dark:bg-warning-900/30';
      case 'hard':
        return 'text-error-600 bg-error-100 dark:bg-error-900/30';
      default:
        return 'text-surface-600 bg-surface-100 dark:bg-surface-700';
    }
  };

  const getStatusIcon = (day) => {
    if (completedDays.has(day.day)) {
      return <CheckCircle2 className="w-6 h-6 text-success-600" />;
    } else if (todayPlan?.day === day.day) {
      return <Zap className="w-6 h-6 text-warning-600" />;
    } else {
      return <Lock className="w-5 h-5 text-surface-500" />;
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-surface-50 dark:bg-surface-900">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="w-8 h-8 text-royal-600" />
            <h1 className="text-5xl font-bold text-navy-900 dark:text-white">
              AI Smart <span className="text-royal-600">Roadmap</span> Generator
            </h1>
            <Sparkles className="w-8 h-8 text-warning-600" />
          </div>
          <p className="text-xl text-surface-600 dark:text-surface-400">
            Get a personalized daily learning plan powered by AI algorithms
          </p>
        </motion.div>

        {/* Today's Focus (if roadmap exists) */}
        {todayPlan && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-surface-800 rounded-3xl p-8 mb-8 border-2 border-warning-400/30 shadow-soft-lg"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Zap className="w-6 h-6 text-warning-600" />
              <h2 className="text-2xl font-bold text-navy-900 dark:text-white">Today's Focus - Day {todayPlan.day}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayPlan.topics.map((topic, idx) => (
                <div key={idx} className="bg-surface-50 dark:bg-surface-700 rounded-xl p-4 border border-surface-200 dark:border-surface-600">
                  <h3 className="font-semibold text-lg mb-2 text-navy-900 dark:text-white">{topic.name}</h3>
                  <div className="flex items-center space-x-2 text-sm text-surface-600 dark:text-surface-400">
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
                        className="text-royal-600 hover:text-royal-700 dark:text-royal-400 dark:hover:text-royal-300 text-sm flex items-center space-x-1">
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
              className="mt-6 w-full py-3 rounded-xl bg-success-600 hover:bg-success-700 font-semibold transition-all flex items-center justify-center space-x-2 text-white shadow-soft-md"
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
            className="bg-white dark:bg-surface-800 rounded-3xl p-8 md:p-12 mb-12 border border-surface-200 dark:border-surface-700 shadow-soft-lg"
          >
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Target Role */}
              <div>
                <label className="block text-lg font-semibold mb-4 text-navy-900 dark:text-white">
                  What's your target role? 🎯
                </label>
                <select
                  value={formData.targetRole}
                  onChange={(e) =>
                    setFormData({ ...formData, targetRole: e.target.value })
                  }
                  required
                  className="w-full px-6 py-4 rounded-xl bg-surface-50 dark:bg-surface-700 text-navy-900 dark:text-white border border-surface-300 dark:border-surface-600 focus:outline-none focus:ring-2 focus:ring-royal-500"
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
                <label className="block text-lg font-semibold mb-4 text-navy-900 dark:text-white">
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
                  className="w-full px-6 py-4 rounded-xl bg-surface-50 dark:bg-surface-700 text-navy-900 dark:text-white border border-surface-300 dark:border-surface-600 focus:outline-none focus:ring-2 focus:ring-royal-500"
                />
              </div>

              {/* Weekly Hours */}
              <div>
                <label className="block text-lg font-semibold mb-4 text-navy-900 dark:text-white">
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
                  className="w-full accent-royal-600"
                />
                <div className="flex justify-between text-sm text-surface-500 mt-2">
                  <span>5h (Casual)</span>
                  <span>35h (Moderate)</span>
                  <span>70h (Intense)</span>
                </div>
              </div>

              {/* Experience Level */}
              <div>
                <label className="block text-lg font-semibold mb-4 text-navy-900 dark:text-white">
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
                      className={`py-4 rounded-xl font-medium transition-all ${formData.experienceLevel === level
                          ? 'bg-royal-600 text-white shadow-soft-md'
                          : 'bg-surface-100 dark:bg-surface-700 text-navy-900 dark:text-white hover:bg-surface-200 dark:hover:bg-surface-600 border border-surface-300 dark:border-surface-600'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus Areas */}
              <div>
                <label className="block text-lg font-semibold mb-4 text-navy-900 dark:text-white">
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
                      className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${formData.focusAreas.includes(topic)
                          ? 'bg-royal-100 dark:bg-royal-900/30 border-2 border-royal-600 text-royal-700 dark:text-royal-300'
                          : 'bg-surface-100 dark:bg-surface-700 text-navy-900 dark:text-white hover:bg-surface-200 dark:hover:bg-surface-600 border border-surface-300 dark:border-surface-600'
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
                className="w-full py-4 rounded-xl bg-royal-600 hover:bg-royal-700 font-semibold text-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-soft-lg"
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
              className="bg-white dark:bg-surface-800 rounded-2xl p-8 mb-8 border border-surface-200 dark:border-surface-700 shadow-soft-lg"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2 text-navy-900 dark:text-white">
                    {roadmap.goals.targetRole} Developer Roadmap
                  </h2>
                  <p className="text-surface-600 dark:text-surface-400">
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
                  className="px-6 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 transition-all text-navy-900 dark:text-white border border-surface-300 dark:border-surface-600"
                >
                  Generate New
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 rounded-xl bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600">
                  <CheckCircle2 className="w-8 h-8 text-success-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-success-600">
                    {completedDays.size}
                  </div>
                  <div className="text-sm text-surface-500">Completed</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600">
                  <Zap className="w-8 h-8 text-warning-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-warning-600">
                    {roadmap.adaptiveMetrics.currentDay}
                  </div>
                  <div className="text-sm text-surface-500">Current Day</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600">
                  <TrendingUp className="w-8 h-8 text-royal-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-royal-600">
                    {roadmap.adaptiveMetrics.overallProgress.toFixed(0)}%
                  </div>
                  <div className="text-sm text-surface-500">Progress</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600">
                  <Award className="w-8 h-8 text-navy-700 dark:text-navy-300 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-navy-700 dark:text-navy-300">
                    {roadmap.adaptiveMetrics.adherenceScore.toFixed(0)}%
                  </div>
                  <div className="text-sm text-surface-500">Adherence</div>
                </div>
              </div>
            </motion.div>

            {/* Timeline */}
            <div className="relative">
              {/* Center line */}
              <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-royal-600 via-royal-500 to-navy-600 opacity-30"></div>

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
                      className={`bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-soft ${
                        completedDays.has(day.day)
                          ? 'border-2 border-success-500/50'
                          : todayPlan?.day === day.day
                          ? 'border-2 border-warning-400/50'
                          : 'border border-surface-200 dark:border-surface-700'
                      }`}
                    >
                      {/* Day badge */}
                      <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-6">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                            completedDays.has(day.day)
                              ? 'bg-success-500 text-white'
                              : todayPlan?.day === day.day
                              ? 'bg-warning-500 text-white'
                              : 'bg-surface-200 dark:bg-surface-700 text-surface-500'
                          }`}
                        >
                          {getStatusIcon(day)}
                        </div>
                      </div>

                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xl font-semibold text-navy-900 dark:text-white">
                            Day {day.day}
                          </h3>
                          <span className="text-sm text-surface-500">
                            {new Date(day.date).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="space-y-4">
                          {day.topics.map((topic, i) => (
                            <div
                              key={i}
                              className="bg-surface-50 dark:bg-surface-700 rounded-xl p-4 border border-surface-200 dark:border-surface-600"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-navy-900 dark:text-white">{topic.name}</h4>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(topic.difficulty)}`}
                                >
                                  {topic.difficulty}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-surface-500">
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
                            className="mt-4 w-full px-4 py-2 rounded-lg bg-success-600 hover:bg-success-700 transition-all text-sm font-medium flex items-center justify-center space-x-2 text-white shadow-soft-md"
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
