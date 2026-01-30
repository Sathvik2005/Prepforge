import mongoose from 'mongoose';

/**
 * QuestionBank Model
 * Dynamically generated and cached questions
 * NOT a static pool - continuously populated from skills, gaps, and JDs
 */

const questionBankSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    index: 'text',
  },
  
  type: {
    type: String,
    enum: ['technical', 'behavioral', 'situational', 'system-design', 'coding-conceptual'],
    required: true,
    index: true,
  },
  
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
    index: true,
  },
  
  // Generation source (NEVER manual/static)
  generationSource: {
    method: {
      type: String,
      enum: ['skill-based', 'gap-based', 'jd-aligned', 'follow-up'],
      required: true,
    },
    
    // Original data that triggered generation
    sourceData: {
      skill: String,
      gapId: mongoose.Schema.Types.ObjectId,
      jobDescriptionId: mongoose.Schema.Types.ObjectId,
      previousAnswer: String,
      previousQuestionId: mongoose.Schema.Types.ObjectId,
    },
    
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    
    generationPrompt: String, // GPT-4 prompt used
    
    targetedConcepts: [String], // What concepts this tests
  },
  
  // Expected answer components
  expectedComponents: {
    requiredConcepts: [String],
    optionalConcepts: [String],
    keyTerms: [String],
    
    idealStructure: {
      hasDefinition: Boolean,
      hasExample: Boolean,
      hasUseCase: Boolean,
      hasTradeOff: Boolean,
      hasComparison: Boolean,
    },
    
    depthIndicators: [String], // Phrases that indicate deep understanding
  },
  
  // Follow-up triggers
  followUpLogic: {
    triggerConditions: [{
      condition: String, // e.g., "if relevance < 50"
      followUpQuestion: String,
    }],
    
    deepeningQuestions: [String], // Questions to probe deeper
  },
  
  // Usage tracking
  usageStats: {
    timesAsked: {
      type: Number,
      default: 0,
    },
    
    averageScore: Number,
    
    commonMistakes: [String],
    
    effectiveness: Number, // how well it identifies gaps (0-100)
    
    lastUsed: Date,
  },
  
  // Related questions
  relatedQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank',
  }],
  
  // Adaptive metadata
  adaptiveData: {
    bestForLevels: [{
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    }],
    
    detectsGaps: [String], // Gap types this question helps identify
    
    prerequisiteKnowledge: [String],
  },
  
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
questionBankSchema.index({ type: 1, difficulty: 1 });
questionBankSchema.index({ 'generationSource.method': 1 });
questionBankSchema.index({ 'generationSource.sourceData.skill': 1 });
questionBankSchema.index({ 'usageStats.timesAsked': 1 });
questionBankSchema.index({ 'usageStats.effectiveness': -1 });

// Methods
questionBankSchema.methods.recordUsage = function(answerScore, identifiedGaps = []) {
  this.usageStats.timesAsked += 1;
  this.usageStats.lastUsed = new Date();
  
  // Update average score
  if (this.usageStats.averageScore) {
    this.usageStats.averageScore = 
      ((this.usageStats.averageScore * (this.usageStats.timesAsked - 1)) + answerScore) / this.usageStats.timesAsked;
  } else {
    this.usageStats.averageScore = answerScore;
  }
  
  // Calculate effectiveness (how well it identifies gaps)
  if (identifiedGaps.length > 0) {
    const currentEffectiveness = this.usageStats.effectiveness || 50;
    this.usageStats.effectiveness = Math.min(100, currentEffectiveness + 5);
  }
};

questionBankSchema.methods.generateFollowUp = function(previousAnswer, answerScore) {
  const triggers = this.followUpLogic?.triggerConditions || [];
  
  for (const trigger of triggers) {
    // Simple condition evaluation
    if (trigger.condition.includes('relevance < 50') && answerScore < 50) {
      return trigger.followUpQuestion;
    }
    if (trigger.condition.includes('depth < 60') && answerScore < 60) {
      return trigger.followUpQuestion;
    }
  }
  
  // Default deepening questions
  if (this.followUpLogic?.deepeningQuestions?.length > 0) {
    const randomIndex = Math.floor(Math.random() * this.followUpLogic.deepeningQuestions.length);
    return this.followUpLogic.deepeningQuestions[randomIndex];
  }
  
  return null;
};

// Statics
questionBankSchema.statics.findOrGenerate = async function(criteria) {
  const {
    skill,
    gapId,
    jobDescriptionId,
    type,
    difficulty,
    generationMethod,
  } = criteria;
  
  // Try to find existing question
  const query = {
    'generationSource.method': generationMethod,
    type,
    difficulty,
    isActive: true,
  };
  
  if (skill) query['generationSource.sourceData.skill'] = skill;
  if (gapId) query['generationSource.sourceData.gapId'] = gapId;
  if (jobDescriptionId) query['generationSource.sourceData.jobDescriptionId'] = jobDescriptionId;
  
  let question = await this.findOne(query);
  
  if (!question) {
    // Generate new question (will be implemented in service layer)
    return null; // Signal to generate
  }
  
  return question;
};

questionBankSchema.statics.generateFromSkill = async function(skill, difficulty = 'medium') {
  // This will be called by QuestionGenerationService
  // Returns a template for what to generate
  return {
    type: 'technical',
    difficulty,
    generationSource: {
      method: 'skill-based',
      sourceData: { skill },
      targetedConcepts: [skill],
    },
  };
};

questionBankSchema.statics.generateFromGap = async function(gapId, gap) {
  const difficulty = gap.severity === 'critical' ? 'hard' : 
                     gap.severity === 'high' ? 'medium' : 'easy';
  
  return {
    type: gap.gapType === 'knowledge-gap' ? 'technical' : 'behavioral',
    difficulty,
    generationSource: {
      method: 'gap-based',
      sourceData: { gapId, skill: gap.skill },
      targetedConcepts: [gap.skill],
    },
    expectedComponents: {
      requiredConcepts: [gap.skill],
      idealStructure: {
        hasDefinition: gap.gapType === 'knowledge-gap',
        hasExample: true,
        hasUseCase: true,
      },
    },
  };
};

questionBankSchema.statics.getEffectiveQuestions = async function(type, difficulty, limit = 10) {
  return this.find({
    type,
    difficulty,
    isActive: true,
    'usageStats.effectiveness': { $gte: 60 },
  })
  .sort({ 'usageStats.effectiveness': -1 })
  .limit(limit);
};

questionBankSchema.statics.getUnderutilized = async function(limit = 20) {
  return this.find({
    isActive: true,
    'usageStats.timesAsked': { $lt: 3 },
  })
  .limit(limit);
};

export default mongoose.model('QuestionBank', questionBankSchema);
