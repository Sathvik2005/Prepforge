import mongoose from 'mongoose';

const MilestoneSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  estimatedHours: Number,
  duration: String, // e.g., "2-3 weeks"
  week: Number, // Starting week number
  phase: { type: String, enum: ['Foundation', 'Intermediate', 'Advanced', 'Mastery'] },
  topics: [String],
  skills: [String], // Skills to learn in this milestone
  resources: [{
    title: String,
    url: String,
    type: { type: String, enum: ['course', 'article', 'video', 'book', 'practice', 'documentation'] },
    description: String
  }],
  projects: [{
    name: String,
    description: String,
    skills: [String],
    estimatedHours: Number
  }],
  assessment: String, // How to evaluate mastery
  prerequisites: [String],
  dependencies: [String],
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  completed: { type: Boolean, default: false },
  completedAt: Date,
  audit: [{
    action: String,
    by: String,
    timestamp: { type: Date, default: Date.now },
    note: String
  }]
}, { strict: false });

const PhaseSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, enum: ['Foundation', 'Intermediate', 'Advanced', 'Mastery'], required: true },
  order: Number,
  durationDays: Number,
  confidence: Number,
  milestones: [MilestoneSchema]
});

const DailyPlanSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  tasks: [{
    taskId: String,
    hours: Number,
    status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' }
  }]
});

const FeasibilityReasonSchema = new mongoose.Schema({
  ruleName: String,
  threshold: mongoose.Schema.Types.Mixed,
  value: mongoose.Schema.Types.Mixed,
  passed: Boolean
});

const ProvenanceSchema = new mongoose.Schema({
  inputs: {
    userId: String,
    role: String,
    jdId: String,
    jdText: String,
    targetDate: String,
    weeklyHours: Number,
    experience: String,
    focusAreas: [String],
    timestamp: { type: Date, default: Date.now }
  },
  ruleSetVersion: { type: String, default: '1.0.0' },
  generatorParams: mongoose.Schema.Types.Mixed,
  aiPhrasingLog: [{
    field: String,
    model: String,
    promptHash: String,
    timestamp: { type: Date, default: Date.now }
  }],
  deterministicLog: [{
    ruleName: String,
    outputSnippet: String,
    triggeredValue: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
  }]
});

const roadmapSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // Firebase UID
  title: { type: String, required: true },
  goal: String,
  currentLevel: String, // User's current skill level
  targetRole: String,
  targetDate: Date,
  timeframe: {
    value: Number,
    unit: String
  },
  skills: [String], // User's current skills
  preferredTopics: [String], // Topics user wants to focus on
  jobDescription: String, // Optional target job description
  weeklyHours: Number,
  experienceLevel: { type: String, enum: ['novice', 'intermediate', 'advanced', 'beginner'] },
  focusAreas: [String],
  
  // AI-generated content fields
  summary: String, // Roadmap summary
  skillGapAnalysis: {
    current: [String],
    required: [String],
    gaps: [String]
  },
  weeklyCommitment: String, // e.g., "10-15 hours"
  totalDuration: String, // e.g., "12 weeks"
  interviewPrep: String, // Interview preparation tips
  careerAdvice: String, // Career guidance
  
  phases: [PhaseSchema],
  milestones: [MilestoneSchema], // Flat list for quick access
  
  schedule: {
    dailyPlans: [DailyPlanSchema]
  },
  
  progress: {
    percentage: { type: Number, default: 0 },
    completedMilestones: { type: Number, default: 0 },
    totalMilestones: { type: Number, default: 0 }
  },
  
  feasibilityScore: {
    value: { type: Number, min: 0, max: 100 },
    reasons: [FeasibilityReasonSchema]
  },
  
  provenance: ProvenanceSchema,
  
  metadata: mongoose.Schema.Types.Mixed, // For storing AI provider info
  
  auditLog: [{
    action: String,
    by: String,
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed
  }],
  
  status: { type: String, enum: ['active', 'completed', 'paused', 'archived'], default: 'active' },
  isAIGenerated: { type: Boolean, default: true }
}, {
  timestamps: true,
  strict: false // Allow additional fields for flexibility
});

// Index for faster queries
roadmapSchema.index({ userId: 1, status: 1 });
roadmapSchema.index({ createdAt: -1 });

// Update progress method
roadmapSchema.methods.updateProgress = function() {
  const completed = this.milestones.filter(m => m.completed).length;
  this.progress.completedMilestones = completed;
  this.progress.totalMilestones = this.milestones.length;
  this.progress.percentage = this.milestones.length > 0 
    ? Math.round((completed / this.milestones.length) * 100)
    : 0;
    
  if (completed === this.milestones.length && this.milestones.length > 0) {
    this.status = 'completed';
  }
};

// Add audit entry
roadmapSchema.methods.addAudit = function(action, by, details = {}) {
  this.auditLog.push({
    action,
    by,
    details,
    timestamp: new Date()
  });
};

export default mongoose.model('Roadmap', roadmapSchema);
