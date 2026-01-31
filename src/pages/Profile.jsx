import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Calendar,
  Award,
  Target,
  Upload,
  Save,
  Trash2,
  FileText,
  Brain,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: 'Passionate developer preparing for interviews',
    goal: 'Software Engineer at FAANG',
    targetDate: '2025-06-01',
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [skillGaps, setSkillGaps] = useState(null);

  const handleSave = () => {
    updateUser({ name: formData.name, email: formData.email });
    setIsEditing(false);
    toast.success('Profile updated successfully! 🎉');
  };

  const handleResumeUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      // Simulate AI analysis
      setTimeout(() => {
        analyzeResume();
      }, 2000);
      toast.loading('Analyzing your resume...', { duration: 2000 });
    }
  };

  const analyzeResume = () => {
    const mockGaps = {
      missing: ['System Design', 'Advanced Algorithms', 'GraphQL'],
      weak: ['Dynamic Programming', 'Database Optimization'],
      strong: ['React', 'JavaScript', 'Node.js', 'REST APIs'],
    };
    setSkillGaps(mockGaps);
    toast.success('Resume analyzed! Skill gaps identified 📊');
  };

  const stats = [
    { icon: Target, label: 'Questions Solved', value: 248, color: 'bg-royal-600' },
    { icon: Award, label: 'Badges Earned', value: 12, color: 'bg-warning-600' },
    { icon: Calendar, label: 'Days Active', value: 45, color: 'bg-success-600' },
    { icon: TrendingUp, label: 'Current Streak', value: 15, color: 'bg-navy-700' },
  ];

  const badges = [
    { name: '7-Day Streak', icon: '🔥', earned: true },
    { name: '100 Problems', icon: '💯', earned: true },
    { name: 'Mock Master', icon: '🎭', earned: true },
    { name: 'Code Ninja', icon: '🥷', earned: false },
    { name: 'Top 10%', icon: '🏆', earned: true },
    { name: 'Speed Demon', icon: '⚡', earned: false },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 text-navy-900 dark:text-white">
            Your <span className="text-royal-600">Profile</span>
          </h1>
          <p className="text-xl text-surface-600 dark:text-surface-400">Manage your account and track your journey</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Profile Information</h2>
                <button
                  onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                  className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'Save' : 'Edit'}</span>
                </button>
              </div>

              <div className="flex items-center space-x-6 mb-8">
                <div className="w-24 h-24 rounded-full bg-royal-600 flex items-center justify-center text-4xl font-bold text-white shadow-soft-lg">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg glass text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                    />
                  ) : (
                    <h3 className="text-3xl font-bold mb-2">{user?.name}</h3>
                  )}
                  <p className="text-gray-400 flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Bio</label>
                  {isEditing ? (
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg glass text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows="3"
                    />
                  ) : (
                    <p className="text-gray-300">{formData.bio}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Interview Goal</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.goal}
                      onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg glass text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-300">{formData.goal}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Target Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.targetDate}
                      onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg glass text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-300">{new Date(formData.targetDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Resume Upload & Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-strong rounded-2xl p-8"
            >
              <h2 className="text-2xl font-semibold mb-6 flex items-center text-navy-900 dark:text-white">
                <Brain className="w-6 h-6 mr-2 text-royal-600 dark:text-royal-400" />
                Resume Skill Gap Analyzer
              </h2>

              <div className="mb-6">
                <label className="flex items-center justify-center w-full px-6 py-4 rounded-xl glass hover:glass-strong transition-all cursor-pointer border-2 border-dashed border-gray-600 hover:border-blue-400">
                  <Upload className="w-5 h-5 mr-2" />
                  <span>{resumeFile ? resumeFile.name : 'Upload Resume (PDF, DOC)'}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {skillGaps && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-400/30">
                    <h4 className="font-semibold text-red-400 mb-2 flex items-center">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Missing Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skillGaps.missing.map((skill, index) => (
                        <span key={index} className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-400/30">
                    <h4 className="font-semibold text-yellow-400 mb-2 flex items-center">
                      <Target className="w-4 h-4 mr-2" />
                      Needs Improvement
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skillGaps.weak.map((skill, index) => (
                        <span key={index} className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-400/30">
                    <h4 className="font-semibold text-green-400 mb-2 flex items-center">
                      <Award className="w-4 h-4 mr-2" />
                      Strong Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skillGaps.strong.map((skill, index) => (
                        <span key={index} className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button className="w-full py-3 rounded-xl bg-royal-600 hover:bg-royal-700 text-white font-semibold transition-all shadow-soft-md">
                    Generate Practice Plan for Gaps
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Right Column - Stats & Badges */}
          <div className="space-y-6">
            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-strong rounded-2xl p-6"
            >
              <h3 className="text-xl font-semibold mb-6">Your Stats</h3>
              <div className="space-y-4">
                {stats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                        <stat.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm text-gray-300">{stat.label}</span>
                    </div>
                    <span className="text-2xl font-bold">{stat.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Badges */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-strong rounded-2xl p-6"
            >
              <h3 className="text-xl font-semibold mb-6">Badges</h3>
              <div className="grid grid-cols-2 gap-4">
                {badges.map((badge, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl text-center transition-all ${
                      badge.earned
                        ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-400/30'
                        : 'glass opacity-50'
                    }`}
                  >
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <p className="text-xs font-medium">{badge.name}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
