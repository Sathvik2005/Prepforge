import mongoose from 'mongoose';

/**
 * CodingChallenge Model
 * Stores coding problems with test cases and evaluates submissions
 * Tracks both code correctness AND explanation quality
 */

const codingChallengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    index: true,
  },
  
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
    index: true,
  },
  
  category: {
    type: String,
    enum: [
      'arrays', 'strings', 'linked-lists', 'trees', 'graphs',
      'dynamic-programming', 'sorting', 'searching', 'recursion',
      'backtracking', 'greedy', 'math', 'bit-manipulation',
      'stack', 'queue', 'hash-table', 'heap'
    ],
    required: true,
    index: true,
  },
  
  tags: [String],
  
  // Problem definition
  problemStatement: {
    type: String,
    required: true,
  },
  
  examples: [{
    input: String,
    output: String,
    explanation: String,
  }],
  
  constraints: [String],
  
  hints: [{
    level: Number,
    text: String,
  }],
  
  // Test cases
  testCases: [{
    input: mongoose.Schema.Types.Mixed,
    expectedOutput: mongoose.Schema.Types.Mixed,
    isHidden: {
      type: Boolean,
      default: false,
    },
    explanation: String,
  }],
  
  // Solution templates
  starterCode: {
    javascript: String,
    python: String,
    java: String,
  },
  
  // Reference solution (not shown to user)
  referenceSolution: {
    javascript: String,
    python: String,
    java: String,
  },
  
  // Evaluation criteria
  evaluationCriteria: {
    timeComplexity: {
      expected: String,
      acceptable: [String],
    },
    spaceComplexity: {
      expected: String,
      acceptable: [String],
    },
    keyAlgorithms: [String],
    requiredConcepts: [String],
  },
  
  // Usage statistics
  statistics: {
    attemptCount: {
      type: Number,
      default: 0,
    },
    passRate: {
      type: Number,
      default: 0,
    },
    averageTime: Number, // minutes
    averageExplanationScore: Number,
  },
  
  // Dynamic generation metadata
  generationMetadata: {
    generatedFrom: {
      type: String,
      enum: ['manual', 'skill-based', 'gap-based', 'jd-aligned'],
    },
    sourceSkills: [String],
    generatedAt: Date,
    targetedGaps: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillGap',
    }],
  },
  
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Submission subdocument schema
const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodingChallenge',
    required: true,
    index: true,
  },
  
  interviewSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ConversationalInterview',
  },
  
  // Submission data
  code: {
    type: String,
    required: true,
  },
  
  language: {
    type: String,
    enum: ['javascript', 'python', 'java'],
    required: true,
  },
  
  // Execution results
  testResults: [{
    testCaseIndex: Number,
    passed: Boolean,
    input: mongoose.Schema.Types.Mixed,
    expectedOutput: mongoose.Schema.Types.Mixed,
    actualOutput: mongoose.Schema.Types.Mixed,
    executionTime: Number, // milliseconds
    error: String,
  }],
  
  overallResult: {
    type: String,
    enum: ['passed', 'failed', 'error', 'timeout'],
    required: true,
  },
  
  passedTestCount: Number,
  totalTestCount: Number,
  
  // Explanation evaluation
  explanation: {
    text: String,
    
    evaluation: {
      approachScore: Number, // 0-100
      complexityAnalysisScore: Number, // 0-100
      clarityScore: Number, // 0-100
      tradeOffDiscussionScore: Number, // 0-100
      
      overallExplanationScore: Number,
      
      feedback: {
        strengths: [String],
        weaknesses: [String],
        suggestions: [String],
      },
      
      missingConcepts: [String],
      correctConcepts: [String],
    },
  },
  
  // Time tracking
  timeSpent: {
    coding: Number, // seconds
    explaining: Number, // seconds
    total: Number, // seconds
  },
  
  // Final score (combines correctness + explanation)
  finalScore: Number, // 0-100
  
  scoreBreakdown: {
    correctness: Number, // 70% weight
    explanation: Number, // 30% weight
  },
  
  submittedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for submission
submissionSchema.index({ userId: 1, challengeId: 1 });
submissionSchema.index({ overallResult: 1 });
submissionSchema.index({ submittedAt: -1 });

// Methods for CodingChallenge
codingChallengeSchema.methods.getVisibleTestCases = function() {
  return this.testCases.filter(tc => !tc.isHidden);
};

codingChallengeSchema.methods.updateStatistics = async function(submissionResult) {
  this.statistics.attemptCount += 1;
  
  // Update pass rate
  const Submission = mongoose.model('CodingSubmission');
  const totalSubmissions = await Submission.countDocuments({ challengeId: this._id });
  const passedSubmissions = await Submission.countDocuments({
    challengeId: this._id,
    overallResult: 'passed',
  });
  
  this.statistics.passRate = (passedSubmissions / totalSubmissions) * 100;
  
  // Update average explanation score
  const submissions = await Submission.find({ challengeId: this._id });
  const avgExplanation = submissions.reduce((sum, s) =>
    sum + (s.explanation?.evaluation?.overallExplanationScore || 0), 0) / submissions.length;
  
  this.statistics.averageExplanationScore = avgExplanation;
  
  await this.save();
};

// Methods for Submission
submissionSchema.methods.calculateFinalScore = function() {
  // Correctness: 70% weight
  const correctnessScore = (this.passedTestCount / this.totalTestCount) * 100;
  
  // Explanation: 30% weight
  const explanationScore = this.explanation?.evaluation?.overallExplanationScore || 0;
  
  this.finalScore = (correctnessScore * 0.7) + (explanationScore * 0.3);
  
  this.scoreBreakdown = {
    correctness: correctnessScore,
    explanation: explanationScore,
  };
  
  return this.finalScore;
};

submissionSchema.methods.evaluateExplanation = function(expectedCriteria) {
  if (!this.explanation?.text) {
    return {
      overallExplanationScore: 0,
      feedback: {
        weaknesses: ['No explanation provided'],
        suggestions: ['Please explain your approach, time/space complexity, and trade-offs'],
      },
    };
  }
  
  const text = this.explanation.text.toLowerCase();
  
  // Approach score
  let approachScore = 0;
  if (text.includes('approach') || text.includes('algorithm') || text.includes('solution')) approachScore += 25;
  if (text.length > 100) approachScore += 25; // detailed explanation
  if (text.includes('step') || text.includes('first') || text.includes('then')) approachScore += 25; // structured
  if (text.includes('example') || text.includes('for instance')) approachScore += 25; // examples
  
  // Complexity analysis score
  let complexityScore = 0;
  if (text.includes('time complexity') || text.includes('o(')) complexityScore += 35;
  if (text.includes('space complexity')) complexityScore += 35;
  if (text.includes('big o') || text.includes('runtime')) complexityScore += 15;
  if (text.includes('worst case') || text.includes('best case') || text.includes('average')) complexityScore += 15;
  
  // Clarity score
  let clarityScore = 70; // base
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length >= 3) clarityScore += 15;
  if (!/\b(um|uh|like|kinda|sorta)\b/g.test(text)) clarityScore += 15;
  
  // Trade-off discussion score
  let tradeOffScore = 0;
  if (text.includes('trade') || text.includes('tradeoff') || text.includes('trade-off')) tradeOffScore += 40;
  if (text.includes('alternative') || text.includes('another approach')) tradeOffScore += 30;
  if (text.includes('advantage') || text.includes('disadvantage') || text.includes('benefit')) tradeOffScore += 30;
  
  const overallExplanationScore = (approachScore + complexityScore + clarityScore + tradeOffScore) / 4;
  
  // Generate feedback
  const strengths = [];
  const weaknesses = [];
  const suggestions = [];
  
  if (approachScore >= 75) strengths.push('Clear explanation of approach');
  else if (approachScore < 50) {
    weaknesses.push('Approach explanation needs more detail');
    suggestions.push('Describe your algorithm step-by-step with examples');
  }
  
  if (complexityScore >= 70) strengths.push('Good complexity analysis');
  else {
    weaknesses.push('Missing complexity analysis');
    suggestions.push('Include time and space complexity in Big O notation');
  }
  
  if (tradeOffScore >= 70) strengths.push('Discussed trade-offs and alternatives');
  else {
    weaknesses.push('No discussion of trade-offs');
    suggestions.push('Compare your approach with alternatives and discuss trade-offs');
  }
  
  return {
    approachScore,
    complexityAnalysisScore: complexityScore,
    clarityScore,
    tradeOffDiscussionScore: tradeOffScore,
    overallExplanationScore,
    feedback: {
      strengths,
      weaknesses,
      suggestions,
    },
  };
};

// Statics
codingChallengeSchema.statics.findBySkillGap = async function(gapSkill, difficulty = 'medium') {
  // Find or generate challenge targeting this gap
  return this.findOne({
    $or: [
      { tags: { $in: [gapSkill] } },
      { 'evaluationCriteria.requiredConcepts': { $in: [gapSkill] } },
    ],
    difficulty,
    isActive: true,
  });
};

const CodingChallenge = mongoose.model('CodingChallenge', codingChallengeSchema);
const CodingSubmission = mongoose.model('CodingSubmission', submissionSchema);

export { CodingChallenge, CodingSubmission };
export default CodingChallenge;
