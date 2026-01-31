import { useState, useEffect } from 'react';
import { Trophy, Star, Zap, TrendingUp, Award, Target, Clock, Flame } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const GamificationDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeframe, setTimeframe] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGamificationData();
  }, [timeframe]);

  const fetchGamificationData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [profileRes, leaderboardRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/gamification/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/gamification/leaderboard?timeframe=${timeframe}&limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      setProfile(profileRes.data.profile);
      setLeaderboard(leaderboardRes.data.leaderboard);
    } catch (error) {
      console.error('Fetch gamification data error:', error);
      toast.error('Failed to load gamification data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center text-gray-400">No profile data available</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* User Profile Card */}
      <div className="bg-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">{profile.name}</h2>
            <p className="text-xl text-surface-300">{profile.title}</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold">Lv {profile.level}</div>
            <div className="text-sm text-surface-300">{profile.xp} XP</div>
          </div>
        </div>
        
        {/* XP Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Level {profile.level}</span>
            <span>Level {profile.level + 1}</span>
          </div>
          <div className="w-full bg-navy-900 rounded-full h-3">
            <div
              className="bg-royal-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${profile.progressToNext}%` }}
            ></div>
          </div>
          <div className="text-center text-xs text-surface-300 mt-1">
            {profile.nextLevelXP - profile.xp} XP to next level
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="w-8 h-8" />}
          title="Problems Solved"
          value={profile.stats.questionsSolved}
          color="blue"
        />
        <StatCard
          icon={<TrendingUp className="w-8 h-8" />}
          title="Accuracy"
          value={`${profile.stats.accuracy.toFixed(1)}%`}
          color="green"
        />
        <StatCard
          icon={<Clock className="w-8 h-8" />}
          title="Study Hours"
          value={profile.stats.studyHours.toFixed(1)}
          color="purple"
        />
        <StatCard
          icon={<Flame className="w-8 h-8" />}
          title="Streak"
          value={`${profile.stats.streak} days`}
          color="orange"
        />
      </div>

      {/* Achievements Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Award className="w-6 h-6 text-yellow-400" />
          Achievements
        </h3>
        
        {/* Earned Badges */}
        {profile.earnedBadges.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-300 mb-3">Earned ({profile.earnedBadges.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {profile.earnedBadges.map((badge, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-yellow-600 to-orange-600 rounded-lg p-4 text-center hover:scale-105 transition-transform cursor-pointer"
                  title={badge.description}
                >
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <div className="text-sm font-semibold text-white">{badge.name}</div>
                  <div className="text-xs text-yellow-100 mt-1">+{badge.xp} XP</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Available Achievements */}
        {profile.availableAchievements.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-300 mb-3">
              Available ({profile.availableAchievements.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {profile.availableAchievements.slice(0, 12).map((achievement, idx) => (
                <div
                  key={idx}
                  className="bg-gray-700 rounded-lg p-4 text-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                  title={achievement.description}
                >
                  <div className="text-4xl mb-2 grayscale">{achievement.icon}</div>
                  <div className="text-sm font-semibold text-gray-300">{achievement.name}</div>
                  <div className="text-xs text-gray-400 mt-1">+{achievement.xp} XP</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Leaderboard
          </h3>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white"
          >
            <option value="all">All Time</option>
            <option value="monthly">This Month</option>
            <option value="weekly">This Week</option>
            <option value="daily">Today</option>
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-3 px-2">Rank</th>
                <th className="pb-3 px-2">Name</th>
                <th className="pb-3 px-2">Level</th>
                <th className="pb-3 px-2">XP</th>
                <th className="pb-3 px-2">Problems</th>
                <th className="pb-3 px-2">Accuracy</th>
                <th className="pb-3 px-2">Streak</th>
                <th className="pb-3 px-2">Badges</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((user) => (
                <tr
                  key={user.userId}
                  className={`border-b border-gray-700 hover:bg-gray-700 transition-colors ${
                    user.rank <= 3 ? 'bg-gray-750' : ''
                  }`}
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {user.rank === 1 && <span className="text-2xl">🥇</span>}
                      {user.rank === 2 && <span className="text-2xl">🥈</span>}
                      {user.rank === 3 && <span className="text-2xl">🥉</span>}
                      {user.rank > 3 && <span className="text-gray-400">#{user.rank}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="text-white font-semibold">{user.name}</div>
                    <div className="text-xs text-gray-400">{user.title}</div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1 text-purple-400">
                      <Star className="w-4 h-4" />
                      <span className="font-semibold">{user.level}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-yellow-400 font-semibold">
                    {user.xp.toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-blue-400">
                    {user.questionsSolved}
                  </td>
                  <td className="py-3 px-2 text-green-400">
                    {user.accuracy.toFixed(1)}%
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1 text-orange-400">
                      <Flame className="w-4 h-4" />
                      <span>{user.streak}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Award className="w-4 h-4" />
                      <span>{user.badgeCount}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color }) => {
  const colorClasses = {
    blue: 'bg-royal-600',
    green: 'bg-success-600',
    purple: 'bg-navy-700',
    orange: 'bg-warning-600',
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-6 text-white`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        <Zap className="w-5 h-5 text-yellow-300" />
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-90">{title}</div>
    </div>
  );
};

export default GamificationDashboard;
