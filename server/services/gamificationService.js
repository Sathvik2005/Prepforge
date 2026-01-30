import User from '../models/User.js';
import Progress from '../models/Progress.js';

// Achievement definitions
const ACHIEVEMENTS = {
  // Streak achievements
  STREAK_3: {
    id: 'streak_3',
    name: 'On Fire! 🔥',
    description: '3-day streak',
    icon: '🔥',
    xp: 50,
    condition: (user) => user.stats.streak >= 3,
  },
  STREAK_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day streak',
    icon: '⚡',
    xp: 150,
    condition: (user) => user.stats.streak >= 7,
  },
  STREAK_30: {
    id: 'streak_30',
    name: 'Month Master',
    description: '30-day streak',
    icon: '👑',
    xp: 500,
    condition: (user) => user.stats.streak >= 30,
  },
  
  // Problem solving achievements
  PROBLEMS_10: {
    id: 'problems_10',
    name: 'Getting Started',
    description: 'Solved 10 problems',
    icon: '🎯',
    xp: 100,
    condition: (user) => user.stats.questionsSolved >= 10,
  },
  PROBLEMS_50: {
    id: 'problems_50',
    name: 'Problem Solver',
    description: 'Solved 50 problems',
    icon: '💎',
    xp: 250,
    condition: (user) => user.stats.questionsSolved >= 50,
  },
  PROBLEMS_100: {
    id: 'problems_100',
    name: 'Centurion',
    description: 'Solved 100 problems',
    icon: '🏆',
    xp: 500,
    condition: (user) => user.stats.questionsSolved >= 100,
  },
  PROBLEMS_250: {
    id: 'problems_250',
    name: 'Elite Coder',
    description: 'Solved 250 problems',
    icon: '🌟',
    xp: 1000,
    condition: (user) => user.stats.questionsSolved >= 250,
  },
  
  // Accuracy achievements
  ACCURACY_80: {
    id: 'accuracy_80',
    name: 'Sharpshooter',
    description: '80%+ accuracy',
    icon: '🎯',
    xp: 200,
    condition: (user) => user.stats.accuracy >= 80,
  },
  ACCURACY_90: {
    id: 'accuracy_90',
    name: 'Perfectionist',
    description: '90%+ accuracy',
    icon: '💯',
    xp: 400,
    condition: (user) => user.stats.accuracy >= 90,
  },
  
  // Study time achievements
  STUDY_10H: {
    id: 'study_10h',
    name: 'Committed Learner',
    description: '10+ hours of study',
    icon: '📚',
    xp: 150,
    condition: (user) => user.stats.studyHours >= 10,
  },
  STUDY_50H: {
    id: 'study_50h',
    name: 'Dedicated Student',
    description: '50+ hours of study',
    icon: '🎓',
    xp: 400,
    condition: (user) => user.stats.studyHours >= 50,
  },
  STUDY_100H: {
    id: 'study_100h',
    name: 'Study Champion',
    description: '100+ hours of study',
    icon: '🏅',
    xp: 800,
    condition: (user) => user.stats.studyHours >= 100,
  },
  
  // Special achievements
  FIRST_PROBLEM: {
    id: 'first_problem',
    name: 'First Step',
    description: 'Solved your first problem',
    icon: '🚀',
    xp: 10,
    condition: (user) => user.stats.questionsSolved >= 1,
  },
  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Solved a problem before 6 AM',
    icon: '🌅',
    xp: 50,
    condition: () => false, // Manually triggered
  },
  NIGHT_OWL: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Solved a problem after midnight',
    icon: '🦉',
    xp: 50,
    condition: () => false, // Manually triggered
  },
};

// XP levels and thresholds
const XP_LEVELS = [
  { level: 1, xpRequired: 0, title: 'Beginner' },
  { level: 2, xpRequired: 100, title: 'Novice' },
  { level: 3, xpRequired: 250, title: 'Apprentice' },
  { level: 4, xpRequired: 500, title: 'Intermediate' },
  { level: 5, xpRequired: 1000, title: 'Advanced' },
  { level: 6, xpRequired: 2000, title: 'Expert' },
  { level: 7, xpRequired: 4000, title: 'Master' },
  { level: 8, xpRequired: 7000, title: 'Grandmaster' },
  { level: 9, xpRequired: 12000, title: 'Legend' },
  { level: 10, xpRequired: 20000, title: 'Mythical' },
];

// Calculate user level from XP
export function calculateLevel(xp) {
  let currentLevel = XP_LEVELS[0];
  
  for (const level of XP_LEVELS) {
    if (xp >= level.xpRequired) {
      currentLevel = level;
    } else {
      break;
    }
  }
  
  const nextLevel = XP_LEVELS.find(l => l.xpRequired > xp);
  const progressToNext = nextLevel 
    ? ((xp - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired)) * 100
    : 100;
  
  return {
    ...currentLevel,
    xp,
    nextLevel,
    progressToNext: Math.round(progressToNext),
  };
}

// Check and award achievements
export async function checkAchievements(userId) {
  const user = await User.findById(userId);
  if (!user) return [];
  
  const earnedBadgeIds = user.badges?.map(b => b.name) || [];
  const newAchievements = [];
  
  for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
    // Skip if already earned
    if (earnedBadgeIds.includes(achievement.id)) continue;
    
    // Check if condition is met
    if (achievement.condition(user)) {
      newAchievements.push(achievement);
      
      // Award badge
      user.badges.push({
        name: achievement.id,
        earnedAt: new Date(),
      });
    }
  }
  
  await user.save();
  return newAchievements;
}

// Update streak (call this daily when user is active)
export async function updateStreak(userId) {
  const user = await User.findById(userId);
  if (!user) return;
  
  const lastActive = user.stats.lastActive;
  const now = new Date();
  const daysDiff = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) {
    // Same day, no update needed
    return user.stats.streak;
  } else if (daysDiff === 1) {
    // Next day, increment streak
    user.stats.streak += 1;
  } else {
    // Streak broken
    user.stats.streak = 1;
  }
  
  user.stats.lastActive = now;
  await user.save();
  
  // Check for streak achievements
  await checkAchievements(userId);
  
  return user.stats.streak;
}

// Award XP and check for level up
export async function awardXP(userId, xp, reason) {
  const user = await User.findById(userId);
  if (!user) return null;
  
  // Initialize XP if not exists
  if (!user.stats.xp) {
    user.stats.xp = 0;
  }
  
  const oldLevel = calculateLevel(user.stats.xp);
  user.stats.xp += xp;
  const newLevel = calculateLevel(user.stats.xp);
  
  await user.save();
  
  const leveledUp = newLevel.level > oldLevel.level;
  
  return {
    xpEarned: xp,
    totalXP: user.stats.xp,
    reason,
    oldLevel: oldLevel.level,
    newLevel: newLevel.level,
    leveledUp,
  };
}

// Get leaderboard
export async function getLeaderboard(timeframe = 'all', limit = 50) {
  let query = {};
  
  // Filter by timeframe if needed
  if (timeframe !== 'all') {
    const now = new Date();
    let startDate;
    
    if (timeframe === 'daily') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (timeframe === 'weekly') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (timeframe === 'monthly') {
      startDate = new Date(now.setMonth(now.getMonth() - 1));
    }
    
    if (startDate) {
      query['stats.lastActive'] = { $gte: startDate };
    }
  }
  
  const users = await User.find(query)
    .select('name email stats badges')
    .sort({ 'stats.xp': -1, 'stats.questionsSolved': -1 })
    .limit(limit);
  
  return users.map((user, index) => {
    const level = calculateLevel(user.stats.xp || 0);
    
    return {
      rank: index + 1,
      userId: user._id,
      name: user.name,
      email: user.email,
      level: level.level,
      title: level.title,
      xp: user.stats.xp || 0,
      questionsSolved: user.stats.questionsSolved || 0,
      accuracy: user.stats.accuracy || 0,
      streak: user.stats.streak || 0,
      badgeCount: user.badges?.length || 0,
    };
  });
}

// Get user gamification profile
export async function getUserGamificationProfile(userId) {
  const user = await User.findById(userId).select('name stats badges');
  if (!user) return null;
  
  const level = calculateLevel(user.stats.xp || 0);
  const earnedBadges = user.badges?.map(b => {
    const achievement = Object.values(ACHIEVEMENTS).find(a => a.id === b.name);
    return {
      ...b,
      ...achievement,
    };
  }) || [];
  
  const availableAchievements = Object.values(ACHIEVEMENTS).filter(a => 
    !earnedBadges.some(b => b.id === a.id)
  );
  
  return {
    name: user.name,
    level: level.level,
    title: level.title,
    xp: user.stats.xp || 0,
    nextLevelXP: level.nextLevel?.xpRequired || level.xpRequired,
    progressToNext: level.progressToNext,
    stats: {
      questionsSolved: user.stats.questionsSolved || 0,
      accuracy: user.stats.accuracy || 0,
      studyHours: user.stats.studyHours || 0,
      streak: user.stats.streak || 0,
      lastActive: user.stats.lastActive,
    },
    earnedBadges,
    availableAchievements: availableAchievements.map(a => ({
      ...a,
      progress: a.condition(user) ? 100 : 0, // Could be more granular
    })),
  };
}

// Calculate and update user accuracy
export async function updateUserAccuracy(userId) {
  const progress = await Progress.find({ userId });
  
  if (progress.length === 0) return 0;
  
  const correctAnswers = progress.filter(p => p.isCorrect).length;
  const accuracy = (correctAnswers / progress.length) * 100;
  
  await User.findByIdAndUpdate(userId, {
    'stats.accuracy': Math.round(accuracy * 10) / 10, // Round to 1 decimal
  });
  
  return accuracy;
}

export {
  ACHIEVEMENTS,
  XP_LEVELS,
};
