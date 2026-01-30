import mongoose from 'mongoose';

/**
 * ConversationalInterview Model
 * Tracks multi-turn interview sessions with context and follow-ups
 * Supports HR, Technical, and Coding interview types
 */
const conversationalInterviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Interview metadata
  interviewType: {
    type: String,
    enum: ['hr', 'technical', 'coding', 'behavioral', 'mixed'],
    required: true,
  },
  
  targetRole: {
    type: String,
    required: true, // e.g., 'Frontend Developer', 'Data Scientist'
  },
  
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'adaptive'],
    default: 'adaptive',
  },
  
  // Resume context (if available)
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParsedResume',
  },
  
  // Job description context (if provided)
  jobDescription: {
    title: String,
    requiredSkills: [String],
    preferredSkills: [String],
    responsibilities: [String],
    rawText: String,
  },
  
  // Interview state
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'abandoned'],
    default: 'scheduled',
  },
  
  // Conversation turns (Q&A pairs)
  turns: [{
    turnNumber: Number,
    
    // Question details
    question: {
      text: String,
      type: {
        type: String,
        enum: ['opening', 'technical', 'behavioral', 'situational', 'follow-up', 'closing'],
      },
      topic: String, // e.g., 'React Hooks', 'Conflict Resolution'
      difficulty: String,
      expectedKeyPoints: [String], // What a good answer should cover
      isFollowUp: Boolean,
      parentTurnNumber: Number, // If this is a follow-up
    },
    
    // Candidate answer
    answer: {
      text: String,
      timestamp: Date,
      timeSpent: Number, // seconds
      wordCount: Number,
    },
    
    // Media reference (for video interviews)
    media: {
      mediaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media'
      },
      duration: Number, // seconds
      size: Number, // bytes
      type: String, // mime type
      streamUrl: String
    },
    
    // Real-time evaluation (rule-based)
    evaluation: {
      // Component scores (0-100)
      clarity: Number,
      relevance: Number,
      depth: Number,
      structure: Number,
      confidence: Number,
      
      // Overall turn score
      turnScore: Number,
      
      // Detected strengths and gaps
      detectedKeyPoints: [String],
      missedKeyPoints: [String],
      
      // Explanation of scoring
      feedback: {
        positive: [String],
        negative: [String],
        suggestions: [String],
      },
      
      // Follow-up decision
      needsFollowUp: Boolean,
      followUpReason: String,
    },
    
    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Overall interview evaluation
  finalEvaluation: {
    // Aggregate scores
    scores: {
      technicalKnowledge: Number,
      communication: Number,
      problemSolving: Number,
      behavioral: Number,
      overall: Number,
    },
    
    // Strengths and weaknesses
    strengths: [String],
    weaknesses: [String],
    
    // Skill gaps identified
    skillGaps: [{
      skill: String,
      gapType: {
        type: String,
        enum: ['knowledge-gap', 'explanation-gap', 'depth-gap'],
      },
      severity: {
        type: String,
        enum: ['critical', 'major', 'minor'],
      },
      evidence: String, // Which turn revealed this
    }],
    
    // Interview readiness
    readinessScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    
    // Detailed feedback
    summary: String,
    recommendations: [String],
  },
  
  // Interview analytics
  analytics: {
    totalTurns: Number,
    averageResponseTime: Number,
    averageTurnScore: Number,
    followUpCount: Number,
    topicsCovered: [String],
    difficultyCurve: [String], // ['easy', 'medium', 'hard', ...]
  },
  
  // Adaptive interview context
  interviewContext: {
    currentDifficulty: String,
    topicSequence: [String],
    performanceTrend: [Number], // Turn-by-turn scores
    strugglingTopics: [String],
    strongTopics: [String],
  },
  
  // Timestamps
  startedAt: Date,
  completedAt: Date,
  duration: Number, // Total time in seconds
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
});

// Indexes
conversationalInterviewSchema.index({ userId: 1, status: 1 });
conversationalInterviewSchema.index({ interviewType: 1, targetRole: 1 });
conversationalInterviewSchema.index({ createdAt: -1 });

// Virtual: Is interview active?
conversationalInterviewSchema.virtual('isActive').get(function() {
  return this.status === 'in-progress';
});

// Virtual: Progress percentage
conversationalInterviewSchema.virtual('progressPercent').get(function() {
  const targetTurns = 10; // Typical interview length
  return Math.min((this.turns.length / targetTurns) * 100, 100);
});

// Method: Add a new turn
conversationalInterviewSchema.methods.addTurn = function(questionData, answerData = null) {
  const turnNumber = this.turns.length + 1;
  
  const newTurn = {
    turnNumber,
    question: questionData,
    answer: answerData,
    createdAt: new Date(),
  };
  
  this.turns.push(newTurn);
  this.analytics.totalTurns = this.turns.length;
  
  return newTurn;
};

// Method: Evaluate a turn (rule-based)
conversationalInterviewSchema.methods.evaluateTurn = function(turnNumber, answer) {
  const turn = this.turns.find(t => t.turnNumber === turnNumber);
  if (!turn) throw new Error('Turn not found');
  
  // Store answer
  turn.answer = {
    text: answer.text,
    timestamp: new Date(),
    timeSpent: answer.timeSpent || 0,
    wordCount: answer.text.split(/\s+/).length,
  };
  
  // Rule-based evaluation
  const evaluation = this._evaluateAnswer(turn.question, turn.answer);
  turn.evaluation = evaluation;
  
  // Update interview context
  this.interviewContext.performanceTrend.push(evaluation.turnScore);
  
  if (evaluation.turnScore < 60) {
    if (!this.interviewContext.strugglingTopics.includes(turn.question.topic)) {
      this.interviewContext.strugglingTopics.push(turn.question.topic);
    }
  } else if (evaluation.turnScore >= 80) {
    if (!this.interviewContext.strongTopics.includes(turn.question.topic)) {
      this.interviewContext.strongTopics.push(turn.question.topic);
    }
  }
  
  return evaluation;
};

// Internal: Rule-based answer evaluation
conversationalInterviewSchema.methods._evaluateAnswer = function(question, answer) {
  const evaluation = {
    clarity: 0,
    relevance: 0,
    depth: 0,
    structure: 0,
    confidence: 0,
    turnScore: 0,
    detectedKeyPoints: [],
    missedKeyPoints: [],
    feedback: { positive: [], negative: [], suggestions: [] },
    needsFollowUp: false,
    followUpReason: '',
  };
  
  const text = answer.text.toLowerCase();
  const wordCount = answer.wordCount;
  
  // 1. Clarity (20%)
  if (wordCount >= 30 && wordCount <= 200) {
    evaluation.clarity = 85;
  } else if (wordCount < 30) {
    evaluation.clarity = 40;
    evaluation.feedback.negative.push('Answer is too brief');
  } else {
    evaluation.clarity = 60;
    evaluation.feedback.negative.push('Answer could be more concise');
  }
  
  // 2. Relevance (25%)
  const expectedKeywords = question.expectedKeyPoints || [];
  const matchedKeywords = expectedKeywords.filter(kw => 
    text.includes(kw.toLowerCase())
  );
  
  evaluation.detectedKeyPoints = matchedKeywords;
  evaluation.missedKeyPoints = expectedKeywords.filter(kw => 
    !matchedKeywords.includes(kw)
  );
  
  if (expectedKeywords.length > 0) {
    evaluation.relevance = (matchedKeywords.length / expectedKeywords.length) * 100;
  } else {
    evaluation.relevance = 70; // Default if no expected points
  }
  
  if (evaluation.relevance < 50) {
    evaluation.needsFollowUp = true;
    evaluation.followUpReason = 'Answer did not cover key concepts';
  }
  
  // 3. Depth (25%)
  const hasExample = /for example|for instance|such as|like when/i.test(text);
  const hasExplanation = /because|reason|this is|that is why/i.test(text);
  const hasDetails = wordCount > 50;
  
  let depthScore = 50;
  if (hasExample) depthScore += 20;
  if (hasExplanation) depthScore += 20;
  if (hasDetails) depthScore += 10;
  
  evaluation.depth = Math.min(depthScore, 100);
  
  if (evaluation.depth < 60 && !question.isFollowUp) {
    evaluation.needsFollowUp = true;
    evaluation.followUpReason = 'Need more detail or examples';
  }
  
  // 4. Structure (15%)
  const hasIntro = /first|to start|initially/i.test(text);
  const hasConclusion = /finally|in conclusion|therefore|so /i.test(text);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let structureScore = 50;
  if (sentences.length >= 3) structureScore += 25;
  if (hasIntro) structureScore += 12;
  if (hasConclusion) structureScore += 13;
  
  evaluation.structure = Math.min(structureScore, 100);
  
  // 5. Confidence (15%)
  const hedgingWords = /i think|maybe|perhaps|probably|kind of|sort of/gi;
  const hedgeCount = (text.match(hedgingWords) || []).length;
  
  evaluation.confidence = Math.max(0, 100 - (hedgeCount * 15));
  
  if (evaluation.confidence < 60) {
    evaluation.feedback.suggestions.push('Speak more confidently, avoid hedging words');
  }
  
  // Calculate weighted overall turn score
  evaluation.turnScore = Math.round(
    evaluation.clarity * 0.20 +
    evaluation.relevance * 0.25 +
    evaluation.depth * 0.25 +
    evaluation.structure * 0.15 +
    evaluation.confidence * 0.15
  );
  
  // Generate positive feedback
  if (evaluation.turnScore >= 80) {
    evaluation.feedback.positive.push('Strong answer with good structure');
  }
  if (matchedKeywords.length > 0) {
    evaluation.feedback.positive.push(`Covered key points: ${matchedKeywords.join(', ')}`);
  }
  
  // Generate suggestions
  if (evaluation.missedKeyPoints.length > 0) {
    evaluation.feedback.suggestions.push(
      `Consider mentioning: ${evaluation.missedKeyPoints.join(', ')}`
    );
  }
  
  return evaluation;
};

// Method: Calculate final evaluation
conversationalInterviewSchema.methods.calculateFinalEvaluation = function() {
  if (this.turns.length === 0) {
    throw new Error('No turns to evaluate');
  }
  
  const evaluatedTurns = this.turns.filter(t => t.evaluation);
  
  if (evaluatedTurns.length === 0) {
    throw new Error('No evaluated turns');
  }
  
  // Aggregate scores
  const avgScore = evaluatedTurns.reduce((sum, t) => sum + t.evaluation.turnScore, 0) / evaluatedTurns.length;
  
  const technicalTurns = evaluatedTurns.filter(t => t.question.type === 'technical');
  const technicalScore = technicalTurns.length > 0
    ? technicalTurns.reduce((sum, t) => sum + t.evaluation.turnScore, 0) / technicalTurns.length
    : 70;
  
  const behavioralTurns = evaluatedTurns.filter(t => 
    ['behavioral', 'situational'].includes(t.question.type)
  );
  const behavioralScore = behavioralTurns.length > 0
    ? behavioralTurns.reduce((sum, t) => sum + t.evaluation.turnScore, 0) / behavioralTurns.length
    : 70;
  
  // Communication = average clarity + structure
  const avgClarity = evaluatedTurns.reduce((sum, t) => sum + t.evaluation.clarity, 0) / evaluatedTurns.length;
  const avgStructure = evaluatedTurns.reduce((sum, t) => sum + t.evaluation.structure, 0) / evaluatedTurns.length;
  const communicationScore = (avgClarity + avgStructure) / 2;
  
  // Problem solving = average depth + relevance
  const avgDepth = evaluatedTurns.reduce((sum, t) => sum + t.evaluation.depth, 0) / evaluatedTurns.length;
  const avgRelevance = evaluatedTurns.reduce((sum, t) => sum + t.evaluation.relevance, 0) / evaluatedTurns.length;
  const problemSolvingScore = (avgDepth + avgRelevance) / 2;
  
  this.finalEvaluation = {
    scores: {
      technicalKnowledge: Math.round(technicalScore),
      communication: Math.round(communicationScore),
      problemSolving: Math.round(problemSolvingScore),
      behavioral: Math.round(behavioralScore),
      overall: Math.round(avgScore),
    },
    strengths: this.interviewContext.strongTopics,
    weaknesses: this.interviewContext.strugglingTopics,
    skillGaps: [], // Populated by gap analysis service
    readinessScore: Math.round(avgScore),
    summary: this._generateSummary(avgScore),
    recommendations: this._generateRecommendations(),
  };
  
  return this.finalEvaluation;
};

// Internal: Generate summary
conversationalInterviewSchema.methods._generateSummary = function(overallScore) {
  if (overallScore >= 85) {
    return 'Excellent performance. Strong technical knowledge and communication skills.';
  } else if (overallScore >= 70) {
    return 'Good performance. Demonstrates solid understanding with room for improvement in explanation depth.';
  } else if (overallScore >= 55) {
    return 'Moderate performance. Shows foundational knowledge but needs to work on clarity and detail.';
  } else {
    return 'Needs improvement. Focus on building stronger technical foundations and interview communication skills.';
  }
};

// Internal: Generate recommendations
conversationalInterviewSchema.methods._generateRecommendations = function() {
  const recommendations = [];
  
  if (this.interviewContext.strugglingTopics.length > 0) {
    recommendations.push(
      `Strengthen knowledge in: ${this.interviewContext.strugglingTopics.join(', ')}`
    );
  }
  
  const lowConfidenceTurns = this.turns.filter(t => 
    t.evaluation && t.evaluation.confidence < 60
  ).length;
  
  if (lowConfidenceTurns > this.turns.length / 3) {
    recommendations.push('Practice explaining concepts more confidently without hedging words');
  }
  
  const shortAnswers = this.turns.filter(t => 
    t.answer && t.answer.wordCount < 30
  ).length;
  
  if (shortAnswers > this.turns.length / 3) {
    recommendations.push('Provide more detailed answers with examples');
  }
  
  return recommendations;
};

export default mongoose.model('ConversationalInterview', conversationalInterviewSchema);
