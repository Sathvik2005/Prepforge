import mongoose from 'mongoose';

/**
 * SkillGap Model
 * Tracks identified gaps between resume, JD, and interview performance
 * Distinguishes knowledge gaps from explanation gaps
 */

const skillGapSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParsedResume',
  },
  
  jobDescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobDescription',
  },
  
  interviewSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ConversationalInterview',
  },
  
  // Gap classification
  gapType: {
    type: String,
    enum: [
      'knowledge-gap',      // Skill not on resume, not demonstrated in interview
      'explanation-gap',    // On resume but couldn't explain well
      'depth-gap',          // Explained but lacked depth/examples
      'application-gap',    // Knows concept but can't apply
      'resume-missing',     // Required by JD, not on resume
      'interview-missing',  // On resume, not verified in interview
    ],
    required: true,
  },
  
  skill: {
    type: String,
    required: true,
  },
  
  category: {
    type: String,
    enum: ['technical', 'soft', 'tool', 'framework', 'language', 'concept'],
  },
  
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    required: true,
  },
  
  // Evidence from different sources
  evidence: {
    fromResume: {
      present: Boolean,
      location: String, // section where it appears
      context: String,  // surrounding text
    },
    
    fromJD: {
      required: Boolean,
      preferred: Boolean,
      frequency: Number, // how many times mentioned
      context: String,
    },
    
    fromInterview: {
      asked: Boolean,
      turnNumbers: [Number],
      averageScore: Number,
      missedConcepts: [String],
      feedback: String,
    },
  },
  
  // Gap analysis
  analysis: {
    detectedAt: {
      type: Date,
      default: Date.now,
    },
    
    detectionMethod: {
      type: String,
      enum: ['resume-jd-comparison', 'interview-evaluation', 'skill-inference'],
    },
    
    confidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    
    reasoning: String,
  },
  
  // Recommendations
  recommendation: {
    priority: {
      type: Number,
      min: 1,
      max: 10,
    },
    
    action: {
      type: String,
      enum: [
        'learn-fundamentals',
        'practice-explaining',
        'build-project',
        'study-use-cases',
        'improve-depth',
        'add-to-resume',
      ],
    },
    
    resources: [{
      type: String,
      url: String,
      description: String,
    }],
    
    estimatedTimeToClose: String, // e.g., "2-3 weeks"
    
    practiceQuestions: [String],
  },
  
  // Progress tracking
  status: {
    type: String,
    enum: ['identified', 'in-progress', 'improved', 'closed'],
    default: 'identified',
  },
  
  progressNotes: [{
    date: Date,
    note: String,
    scoreImprovement: Number,
  }],
  
  closedAt: Date,
}, {
  timestamps: true,
});

// Indexes
skillGapSchema.index({ userId: 1, status: 1 });
skillGapSchema.index({ severity: 1, status: 1 });
skillGapSchema.index({ skill: 1 });
skillGapSchema.index({ interviewSessionId: 1 });

// Methods
skillGapSchema.methods.calculatePriority = function() {
  let priority = 5; // base
  
  // Severity impact
  const severityWeights = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1,
  };
  priority += severityWeights[this.severity] || 0;
  
  // Type impact (knowledge gaps more critical)
  if (this.gapType === 'knowledge-gap') priority += 2;
  if (this.gapType === 'explanation-gap') priority += 1;
  
  // JD requirement impact
  if (this.evidence.fromJD?.required) priority += 3;
  if (this.evidence.fromJD?.preferred) priority += 1;
  
  return Math.min(priority, 10);
};

skillGapSchema.methods.generateActionPlan = function() {
  const plan = {
    skill: this.skill,
    type: this.gapType,
    priority: this.calculatePriority(),
    steps: [],
  };
  
  switch (this.gapType) {
    case 'knowledge-gap':
      plan.steps = [
        'Learn fundamentals through documentation',
        'Complete practical tutorials',
        'Build a small project using this skill',
        'Practice explaining key concepts',
      ];
      break;
      
    case 'explanation-gap':
      plan.steps = [
        'Review core concepts',
        'Practice explaining out loud',
        'Prepare examples and analogies',
        'Mock interview practice',
      ];
      break;
      
    case 'depth-gap':
      plan.steps = [
        'Study advanced use cases',
        'Understand trade-offs and limitations',
        'Explore real-world applications',
        'Prepare detailed examples',
      ];
      break;
      
    default:
      plan.steps = ['Review skill', 'Practice application'];
  }
  
  return plan;
};

// Statics
skillGapSchema.statics.identifyGapsFromComparison = async function(resumeSkills, jdSkills, userId) {
  const gaps = [];
  
  // Skills required by JD but missing from resume
  for (const skill of jdSkills.required) {
    if (!resumeSkills.includes(skill.toLowerCase())) {
      gaps.push({
        userId,
        skill,
        gapType: 'resume-missing',
        severity: 'high',
        evidence: {
          fromResume: { present: false },
          fromJD: { required: true },
        },
      });
    }
  }
  
  return gaps;
};

export default mongoose.model('SkillGap', skillGapSchema);
