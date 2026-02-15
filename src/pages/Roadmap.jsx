import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Target,
  Calendar,
  CheckCircle,
  Circle,
  TrendingUp,
  Brain,
  BookOpen,
  Play,
  Clock,
  Award,
  Edit,
  Trash2,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthStore } from '../store/authStore';
import { useTracking } from '../contexts/TrackingContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const Roadmap = () => {
  const { currentUser } = useAuth();
  const { token } = useAuthStore();
  const { trackPageView, track } = useTracking();
  const [roadmaps, setRoadmaps] = useState([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  // Track page view
  useEffect(() => {
    trackPageView('/roadmap');
  }, [trackPageView]);

  // Axios config with authentication
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  // Form state for roadmap generation
  const [formData, setFormData] = useState({
    goal: '',
    currentLevel: 'beginner',
    targetRole: '',
    timeframeValue: 12,
    timeframeUnit: 'weeks',
    skills: '',
    preferredTopics: '',
  });

  useEffect(() => {
    if (currentUser?.uid) {
      loadUserRoadmaps();
    }
  }, [currentUser]);

  const loadUserRoadmaps = async () => {
    if (!currentUser?.uid) {
      console.log('No user ID available yet');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.get(`/api/roadmap/user/${currentUser.uid}`, axiosConfig);
      if (response.data.success) {
        setRoadmaps(response.data.roadmaps);
        if (response.data.roadmaps.length > 0) {
          setSelectedRoadmap(response.data.roadmaps[0]);
        }
      }
    } catch (error) {
      console.error('Error loading roadmaps:', error);
      toast.error('Failed to load roadmaps');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRoadmap = async (e) => {
    e.preventDefault();

    if (!formData.goal || !formData.currentLevel) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      toast.loading('Generating your personalized roadmap...');

      const response = await axios.post('/api/roadmap/generate', {
        goal: formData.goal,
        currentLevel: formData.currentLevel,
        targetRole: formData.targetRole,
        timeframe: {
          value: parseInt(formData.timeframeValue),
          unit: formData.timeframeUnit,
        },
        skills: formData.skills.split(',').map((s) => s.trim()).filter(Boolean),
        preferredTopics: formData.preferredTopics.split(',').map((s) => s.trim()).filter(Boolean),
      }, axiosConfig);

      toast.dismiss();

      if (response.data.success && response.data.roadmap) {
        toast.success('Roadmap generated successfully!');
        
        // Add new roadmap to list and select it
        const newRoadmap = response.data.roadmap;
        setRoadmaps([newRoadmap, ...roadmaps]);
        setSelectedRoadmap(newRoadmap);
        setShowGenerator(false);
        
        // Track event
        track('roadmap_generated', {
          goal: formData.goal,
          timeframe: `${formData.timeframeValue} ${formData.timeframeUnit}`,
          provider: response.data.metadata?.provider
        });
        
        // Reset form
        setFormData({
          goal: '',
          currentLevel: 'beginner',
          targetRole: '',
          timeframeValue: 12,
          timeframeUnit: 'weeks',
          skills: '',
          preferredTopics: '',
        });

        // Show warning if degraded mode
        if (response.data.metadata?.degradedMode) {
          toast('⚠️ Generated with fallback system. Some features may be limited.', {
            duration: 5000,
            icon: '⚠️'
          });
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error generating roadmap:', error);
      toast.dismiss();
      toast.error(error.response?.data?.error || 'Failed to generate roadmap. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMilestoneToggle = async (milestoneId, completed) => {
    if (!selectedRoadmap) return;

    try {
      const endpoint = completed ? 'complete' : 'uncomplete';
      const response = await axios.put(
        `/api/roadmap/${selectedRoadmap._id}/milestone/${milestoneId}/${endpoint}`,
        {},
        axiosConfig
      );
      
      if (response.data.success) {
        setSelectedRoadmap(response.data.roadmap);
        
        // Track milestone completion
        track('milestone_toggled', {
          roadmapId: selectedRoadmap._id,
          milestoneId,
          completed
        });
        
        // Update roadmaps list
        setRoadmaps(roadmaps.map((r) => 
          r._id === response.data.roadmap._id ? response.data.roadmap : r
        ));
        
        toast.success(completed ? 'Milestone completed!' : 'Milestone unmarked');
      }
    } catch (error) {
      console.error('Error updating milestone:', error);
      toast.error('Failed to update milestone');
    }
  };

  const handleDeleteRoadmap = async (roadmapId) => {
    if (!confirm('Are you sure you want to delete this roadmap?')) return;

    try {
      const response = await axios.delete(`/api/roadmap/${roadmapId}`, axiosConfig);

      if (response.data.success) {
        setRoadmaps(roadmaps.filter((r) => r._id !== roadmapId));
        if (selectedRoadmap?._id === roadmapId) {
          setSelectedRoadmap(roadmaps[0] || null);
        }
        toast.success('Roadmap deleted');
      }
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      toast.error('Failed to delete roadmap');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-royal-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-navy-900 dark:text-white">Sign in to access AI Roadmaps</h2>
          <p className="text-surface-600 dark:text-surface-400 mb-6">Create personalized learning paths powered by AI</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-royal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-royal-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 pt-20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold mb-2 text-navy-900 dark:text-white"
            >
              AI Learning <span className="text-royal-600">Roadmaps</span>
            </motion.h1>
            <p className="text-surface-600 dark:text-surface-400">
              Personalized learning paths generated by AI
            </p>
          </div>
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="bg-royal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-royal-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Generate New Roadmap
          </button>
        </div>

        {/* Roadmap Generator Form */}
        <AnimatePresence>
          {showGenerator && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white dark:bg-surface-800 rounded-xl p-6 mb-8 shadow-soft-lg"
            >
              <h2 className="text-2xl font-bold mb-4 text-navy-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-royal-600" />
                Generate AI Roadmap
              </h2>
              <form onSubmit={handleGenerateRoadmap} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-navy-900 dark:text-white">
                      Learning Goal *
                    </label>
                    <input
                      type="text"
                      value={formData.goal}
                      onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                      placeholder="e.g., Become a Full Stack Developer"
                      className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-navy-900 dark:text-white focus:ring-2 focus:ring-royal-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-navy-900 dark:text-white">
                      Current Level *
                    </label>
                    <select
                      value={formData.currentLevel}
                      onChange={(e) => setFormData({ ...formData, currentLevel: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-navy-900 dark:text-white focus:ring-2 focus:ring-royal-500"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-navy-900 dark:text-white">
                      Target Role (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.targetRole}
                      onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                      placeholder="e.g., Software Engineer at FAANG"
                      className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-navy-900 dark:text-white focus:ring-2 focus:ring-royal-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-2 text-navy-900 dark:text-white">
                        Timeframe
                      </label>
                      <input
                        type="number"
                        value={formData.timeframeValue}
                        onChange={(e) => setFormData({ ...formData, timeframeValue: e.target.value })}
                        min="1"
                        max="52"
                        className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-navy-900 dark:text-white focus:ring-2 focus:ring-royal-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-2 text-navy-900 dark:text-white">
                        Unit
                      </label>
                      <select
                        value={formData.timeframeUnit}
                        onChange={(e) => setFormData({ ...formData, timeframeUnit: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-navy-900 dark:text-white focus:ring-2 focus:ring-royal-500"
                      >
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-navy-900 dark:text-white">
                      Current Skills (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.skills}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                      placeholder="e.g., JavaScript, React, Node.js"
                      className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-navy-900 dark:text-white focus:ring-2 focus:ring-royal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-navy-900 dark:text-white">
                      Preferred Topics (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.preferredTopics}
                      onChange={(e) => setFormData({ ...formData, preferredTopics: e.target.value })}
                      placeholder="e.g., System Design, DSA, Web Development"
                      className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-navy-900 dark:text-white focus:ring-2 focus:ring-royal-500"
                    />
                  </div>
                </div>

                <div className="flex gap-4 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowGenerator(false)}
                    className="px-6 py-2 rounded-lg border border-surface-300 dark:border-surface-600 text-navy-900 dark:text-white hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-royal-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-royal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {loading ? 'Generating...' : 'Generate with AI'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Roadmap List & Details */}
        {loading && roadmaps.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-600 mx-auto mb-4"></div>
              <p className="text-surface-600 dark:text-surface-400">Loading roadmaps...</p>
            </div>
          </div>
        ) : roadmaps.length === 0 ? (
          <div className="text-center py-20">
            <Target className="w-16 h-16 text-surface-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-navy-900 dark:text-white">No roadmaps yet</h3>
            <p className="text-surface-600 dark:text-surface-400 mb-6">Generate your first AI-powered learning roadmap</p>
            <button
              onClick={() => setShowGenerator(true)}
              className="bg-royal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-royal-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Roadmap Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-soft">
                <h3 className="font-semibold mb-4 text-navy-900 dark:text-white">Your Roadmaps</h3>
                <div className="space-y-2">
                  {roadmaps.map((roadmap) => (
                    <button
                      key={roadmap._id}
                      onClick={() => setSelectedRoadmap(roadmap)}
                      className={`w-full text-left p-4 rounded-lg transition-all ${
                        selectedRoadmap?._id === roadmap._id
                          ? 'bg-royal-100 dark:bg-royal-900 border-2 border-royal-500'
                          : 'bg-surface-50 dark:bg-surface-700 hover:bg-surface-100 dark:hover:bg-surface-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-navy-900 dark:text-white mb-1">{roadmap.title}</h4>
                          <p className="text-sm text-surface-600 dark:text-surface-400 mb-2">{roadmap.goal}</p>
                          <div className="flex items-center gap-2 text-xs text-surface-500">
                            <CheckCircle className="w-3 h-3" />
                            <span>{roadmap.progress.percentage}% Complete</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoadmap(roadmap._id);
                          }}
                          className="text-surface-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Roadmap Details */}
            <div className="lg:col-span-2">
              {selectedRoadmap && (
                <motion.div
                  key={selectedRoadmap._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-soft"
                >
                  {/* Header */}
                  <div className="mb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h2 className="text-3xl font-bold mb-2 text-navy-900 dark:text-white">{selectedRoadmap.title}</h2>
                        <p className="text-surface-600 dark:text-surface-400 mb-2">{selectedRoadmap.goal}</p>
                        
                        {/* Summary */}
                        {selectedRoadmap.summary && (
                          <div className="mt-3 p-4 bg-gradient-to-r from-royal-50 to-purple-50 dark:from-royal-900/20 dark:to-purple-900/20 rounded-lg border border-royal-200 dark:border-royal-800">
                            <p className="text-sm text-navy-900 dark:text-white leading-relaxed">
                              {selectedRoadmap.summary}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        selectedRoadmap.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                        selectedRoadmap.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                        'bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-300'
                      }`}>
                        {selectedRoadmap.status}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-navy-900 dark:text-white">Overall Progress</span>
                        <span className="text-sm font-semibold text-royal-600">{selectedRoadmap.progress.percentage}%</span>
                      </div>
                      <div className="w-full h-3 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedRoadmap.progress.percentage}%` }}
                          className="h-full bg-gradient-to-r from-royal-500 to-royal-600"
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-3 text-center">
                        <Target className="w-5 h-5 text-royal-600 mx-auto mb-1" />
                        <div className="text-sm font-semibold text-navy-900 dark:text-white">{selectedRoadmap.milestones.length}</div>
                        <div className="text-xs text-surface-500">Milestones</div>
                      </div>
                      <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-3 text-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                        <div className="text-sm font-semibold text-navy-900 dark:text-white">{selectedRoadmap.progress.completedMilestones}</div>
                        <div className="text-xs text-surface-500">Completed</div>
                      </div>
                      <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-3 text-center">
                        <Clock className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                        <div className="text-sm font-semibold text-navy-900 dark:text-white">{selectedRoadmap.timeframe.value} {selectedRoadmap.timeframe.unit}</div>
                        <div className="text-xs text-surface-500">Timeline</div>
                      </div>
                    </div>
                  </div>

                  {/* Milestones */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-navy-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-royal-600" />
                      Learning Milestones
                    </h3>
                    
                    {selectedRoadmap.milestones.map((milestone, index) => (
                      <motion.div
                        key={milestone.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`border-2 rounded-xl p-5 transition-all ${
                          milestone.completed
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-surface-300 dark:border-surface-600 hover:border-royal-400 dark:hover:border-royal-500'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => handleMilestoneToggle(milestone.id, !milestone.completed)}
                            className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              milestone.completed
                                ? 'bg-green-500 border-green-500'
                                : 'border-surface-400 hover:border-royal-500'
                            }`}
                          >
                            {milestone.completed && <CheckCircle className="w-4 h-4 text-white" />}
                          </button>

                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="text-lg font-bold text-navy-900 dark:text-white">{milestone.title}</h4>
                                <p className="text-sm text-surface-600 dark:text-surface-400">{milestone.description}</p>
                              </div>
                              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-royal-100 text-royal-700 dark:bg-royal-900 dark:text-royal-300">
                                {milestone.phase}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 mb-3 text-sm text-surface-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {milestone.duration}
                              </span>
                            </div>

                            {/* Topics */}
                            {milestone.topics && milestone.topics.length > 0 && (
                              <div className="mb-3">
                                <div className="text-sm font-semibold text-navy-900 dark:text-white mb-2">Topics:</div>
                                <div className="flex flex-wrap gap-2">
                                  {milestone.topics.map((topic, i) => (
                                    <span
                                      key={i}
                                      className="text-xs px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300"
                                    >
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Skills */}
                            {milestone.skills && milestone.skills.length > 0 && (
                              <div className="mb-3">
                                <div className="text-sm font-semibold text-navy-900 dark:text-white mb-2 flex items-center gap-1">
                                  <TrendingUp className="w-4 h-4 text-royal-600" />
                                  Skills to Master:
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {milestone.skills.map((skill, i) => (
                                    <span
                                      key={i}
                                      className="text-xs px-3 py-1 rounded-full bg-royal-100 dark:bg-royal-900 text-royal-700 dark:text-royal-300 font-medium"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Projects */}
                            {milestone.projects && milestone.projects.length > 0 && (
                              <div className="mb-3">
                                <div className="text-sm font-semibold text-navy-900 dark:text-white mb-2 flex items-center gap-1">
                                  <Brain className="w-4 h-4 text-green-600" />
                                  Practice Projects:
                                </div>
                                <div className="space-y-2">
                                  {milestone.projects.map((project, i) => (
                                    <div key={i} className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                      <div className="font-medium text-sm text-navy-900 dark:text-white">{project.name}</div>
                                      <div className="text-xs text-surface-600 dark:text-surface-400 mt-1">{project.description}</div>
                                      {project.estimatedHours && (
                                        <div className="text-xs text-green-700 dark:text-green-400 mt-1 flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          ~{project.estimatedHours} hours
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Resources */}
                            {milestone.resources && milestone.resources.length > 0 && (
                              <div>
                                <div className="text-sm font-semibold text-navy-900 dark:text-white mb-2">Resources:</div>
                                <div className="space-y-1">
                                  {milestone.resources.map((resource, i) => (
                                    <a
                                      key={i}
                                      href={resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-sm text-royal-600 hover:text-royal-700 dark:text-royal-400 dark:hover:text-royal-300"
                                    >
                                      <Play className="w-3 h-3" />
                                      {resource.title}
                                      <span className="text-xs text-surface-500">({resource.type})</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Roadmap;
