import mongoose from 'mongoose';

const mockInterviewSchema = new mongoose.Schema({
  // Participants
  interviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  interviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Interview details
  status: {
    type: String,
    enum: ['scheduled', 'waiting', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  },
  
  scheduledTime: {
    type: Date,
    required: true,
    index: true
  },
  
  duration: {
    type: Number, // in minutes
    default: 45
  },
  
  // Interview configuration
  type: {
    type: String,
    enum: ['technical', 'behavioral', 'system_design', 'mixed'],
    default: 'technical'
  },
  
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  
  topics: [{
    type: String
  }],
  
  // Role rotation
  currentRound: {
    type: Number,
    default: 1
  },
  
  totalRounds: {
    type: Number,
    default: 2 // Both users get to be interviewer and interviewee
  },
  
  // Session data
  room: {
    type: String,
    unique: true,
    sparse: true // Allow null values
  },
  
  startedAt: Date,
  endedAt: Date,
  
  // Questions used (if predetermined)
  questions: [{
    question: String,
    difficulty: String,
    topic: String,
    askedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Feedback exchange
  feedback: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    round: {
      type: Number,
      required: true
    },
    role: {
      type: String,
      enum: ['interviewer', 'interviewee']
    },
    ratings: {
      technicalSkills: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      problemSolving: { type: Number, min: 1, max: 5 },
      codeQuality: { type: Number, min: 1, max: 5 },
      overall: { type: Number, min: 1, max: 5 }
    },
    strengths: [{ type: String }],
    improvements: [{ type: String }],
    comments: String,
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Notes during interview
  notes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Recording metadata (if enabled)
  recording: {
    enabled: { type: Boolean, default: false },
    url: String,
    duration: Number
  },
  
  // Match metadata
  matchedBy: {
    type: String,
    enum: ['auto', 'manual', 'invite'],
    default: 'auto'
  },
  
  matchCriteria: {
    similarSkillLevel: Boolean,
    similarTopics: Boolean,
    timeZoneCompatible: Boolean
  }
}, {
  timestamps: true
});

// Indexes
mockInterviewSchema.index({ interviewer: 1, status: 1 });
mockInterviewSchema.index({ interviewee: 1, status: 1 });
mockInterviewSchema.index({ scheduledTime: 1, status: 1 });
mockInterviewSchema.index({ room: 1 });

// Virtual for total duration
mockInterviewSchema.virtual('actualDuration').get(function() {
  if (this.startedAt && this.endedAt) {
    return Math.round((this.endedAt - this.startedAt) / (1000 * 60)); // minutes
  }
  return 0;
});

// Methods
mockInterviewSchema.methods.addFeedback = function(feedbackData) {
  this.feedback.push(feedbackData);
  return this.save();
};

mockInterviewSchema.methods.addNote = function(userId, content) {
  this.notes.push({
    user: userId,
    content
  });
  return this.save();
};

mockInterviewSchema.methods.startInterview = function() {
  this.status = 'in_progress';
  this.startedAt = new Date();
  return this.save();
};

mockInterviewSchema.methods.endInterview = function() {
  this.status = 'completed';
  this.endedAt = new Date();
  return this.save();
};

mockInterviewSchema.methods.switchRoles = function() {
  if (this.currentRound < this.totalRounds) {
    this.currentRound++;
    // Swap interviewer and interviewee
    const temp = this.interviewer;
    this.interviewer = this.interviewee;
    this.interviewee = temp;
    return this.save();
  }
  throw new Error('All rounds completed');
};

mockInterviewSchema.methods.getFeedbackForUser = function(userId) {
  return this.feedback.filter(fb => fb.to.toString() === userId.toString());
};

mockInterviewSchema.methods.getAverageRatings = function(userId) {
  const userFeedback = this.getFeedbackForUser(userId);
  
  if (userFeedback.length === 0) return null;
  
  const totals = {
    technicalSkills: 0,
    communication: 0,
    problemSolving: 0,
    codeQuality: 0,
    overall: 0,
    count: 0
  };
  
  userFeedback.forEach(fb => {
    if (fb.ratings) {
      totals.technicalSkills += fb.ratings.technicalSkills || 0;
      totals.communication += fb.ratings.communication || 0;
      totals.problemSolving += fb.ratings.problemSolving || 0;
      totals.codeQuality += fb.ratings.codeQuality || 0;
      totals.overall += fb.ratings.overall || 0;
      totals.count++;
    }
  });
  
  if (totals.count === 0) return null;
  
  return {
    technicalSkills: (totals.technicalSkills / totals.count).toFixed(1),
    communication: (totals.communication / totals.count).toFixed(1),
    problemSolving: (totals.problemSolving / totals.count).toFixed(1),
    codeQuality: (totals.codeQuality / totals.count).toFixed(1),
    overall: (totals.overall / totals.count).toFixed(1)
  };
};

// Statics
mockInterviewSchema.statics.findUpcoming = function(userId, limit = 10) {
  const now = new Date();
  return this.find({
    $or: [
      { interviewer: userId },
      { interviewee: userId }
    ],
    scheduledTime: { $gte: now },
    status: { $in: ['scheduled', 'waiting'] }
  })
  .sort({ scheduledTime: 1 })
  .limit(limit)
  .populate('interviewer interviewee', 'name email avatar')
  .lean();
};

mockInterviewSchema.statics.findPast = function(userId, limit = 20) {
  return this.find({
    $or: [
      { interviewer: userId },
      { interviewee: userId }
    ],
    status: { $in: ['completed', 'cancelled'] }
  })
  .sort({ scheduledTime: -1 })
  .limit(limit)
  .populate('interviewer interviewee', 'name email avatar')
  .lean();
};

mockInterviewSchema.statics.findAvailableMatches = async function(userId, preferences = {}) {
  // Find users available for mock interviews
  // This is a simplified version - in production, you'd have a more sophisticated matching algorithm
  
  const { type, difficulty, topics, timeSlot } = preferences;
  
  const query = {
    $or: [
      { interviewer: userId },
      { interviewee: userId }
    ],
    status: 'waiting'
  };
  
  if (type) query.type = type;
  if (difficulty) query.difficulty = difficulty;
  if (topics && topics.length > 0) query.topics = { $in: topics };
  
  return this.find(query)
    .populate('interviewer interviewee', 'name email avatar skills')
    .lean();
};

mockInterviewSchema.statics.getUserStats = async function(userId) {
  const completed = await this.countDocuments({
    $or: [
      { interviewer: userId },
      { interviewee: userId }
    ],
    status: 'completed'
  });
  
  const interviews = await this.find({
    $or: [
      { interviewer: userId },
      { interviewee: userId }
    ],
    status: 'completed'
  }).select('feedback').lean();
  
  // Calculate average ratings
  let totalRatings = {
    technicalSkills: 0,
    communication: 0,
    problemSolving: 0,
    codeQuality: 0,
    overall: 0,
    count: 0
  };
  
  interviews.forEach(interview => {
    const userFeedback = interview.feedback.filter(
      fb => fb.to.toString() === userId.toString()
    );
    
    userFeedback.forEach(fb => {
      if (fb.ratings) {
        totalRatings.technicalSkills += fb.ratings.technicalSkills || 0;
        totalRatings.communication += fb.ratings.communication || 0;
        totalRatings.problemSolving += fb.ratings.problemSolving || 0;
        totalRatings.codeQuality += fb.ratings.codeQuality || 0;
        totalRatings.overall += fb.ratings.overall || 0;
        totalRatings.count++;
      }
    });
  });
  
  const averageRatings = totalRatings.count > 0 ? {
    technicalSkills: (totalRatings.technicalSkills / totalRatings.count).toFixed(1),
    communication: (totalRatings.communication / totalRatings.count).toFixed(1),
    problemSolving: (totalRatings.problemSolving / totalRatings.count).toFixed(1),
    codeQuality: (totalRatings.codeQuality / totalRatings.count).toFixed(1),
    overall: (totalRatings.overall / totalRatings.count).toFixed(1)
  } : null;
  
  return {
    totalCompleted: completed,
    averageRatings
  };
};

const MockInterview = mongoose.model('MockInterview', mockInterviewSchema);

export default MockInterview;
