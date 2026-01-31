import mongoose from 'mongoose';

const progressItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true
  },
  itemType: {
    type: String,
    enum: ['problem', 'video', 'topic', 'course'],
    required: true
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed', 'revisit'],
    default: 'not-started'
  },
  completedAt: {
    type: Date
  },
  attempts: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number, // in minutes
    default: 0
  },
  notes: {
    type: String
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
});

const sheetProgressSchema = new mongoose.Schema({
  sheetId: {
    type: String,
    required: true
  },
  sheetType: {
    type: String,
    enum: ['a2z-sheet', 'blind-75', 'sde-sheet', 'striver-79', 'cn-sheet', 'dbms-sheet', 'os-sheet', 'system-design', 'cp-sheet'],
    required: true
  },
  totalProblems: {
    type: Number,
    required: true
  },
  completedProblems: {
    type: Number,
    default: 0
  },
  items: [progressItemSchema],
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
});

const playlistProgressSchema = new mongoose.Schema({
  playlistId: {
    type: String,
    required: true
  },
  playlistType: {
    type: String,
    enum: ['array', 'binary-search', 'dynamic-programming', 'graphs', 'linked-lists', 'recursion', 'stack-queue', 'strings', 'trees'],
    required: true
  },
  totalVideos: {
    type: Number,
    required: true
  },
  completedVideos: {
    type: Number,
    default: 0
  },
  items: [progressItemSchema],
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
});

const dsaProgressSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  sheets: [sheetProgressSchema],
  playlists: [playlistProgressSchema],
  overallStats: {
    totalProblemsAttempted: {
      type: Number,
      default: 0
    },
    totalProblemsSolved: {
      type: Number,
      default: 0
    },
    totalVideosWatched: {
      type: Number,
      default: 0
    },
    totalTimeSpent: {
      type: Number, // in minutes
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    lastActiveDate: {
      type: Date,
      default: Date.now
    }
  },
  achievements: [{
    achievementId: String,
    achievementName: String,
    unlockedAt: Date,
    category: {
      type: String,
      enum: ['problems', 'sheets', 'streak', 'learning', 'time']
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamps before saving
dsaProgressSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate completion percentage for a sheet
sheetProgressSchema.methods.getCompletionPercentage = function() {
  if (this.totalProblems === 0) return 0;
  return Math.round((this.completedProblems / this.totalProblems) * 100);
};

// Calculate completion percentage for a playlist
playlistProgressSchema.methods.getCompletionPercentage = function() {
  if (this.totalVideos === 0) return 0;
  return Math.round((this.completedVideos / this.totalVideos) * 100);
};

// Update streak based on last active date
dsaProgressSchema.methods.updateStreak = function() {
  const now = new Date();
  const lastActive = new Date(this.overallStats.lastActiveDate);
  
  // Reset time to midnight for comparison
  now.setHours(0, 0, 0, 0);
  lastActive.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) {
    // Same day, no change
    return;
  } else if (daysDiff === 1) {
    // Consecutive day, increment streak
    this.overallStats.currentStreak++;
    if (this.overallStats.currentStreak > this.overallStats.longestStreak) {
      this.overallStats.longestStreak = this.overallStats.currentStreak;
    }
  } else {
    // Streak broken
    this.overallStats.currentStreak = 1;
  }
  
  this.overallStats.lastActiveDate = new Date();
};

const DSAProgress = mongoose.model('DSAProgress', dsaProgressSchema);

export default DSAProgress;
