import mongoose from 'mongoose';

/**
 * Mistake Pattern Schema
 * Stores categorized errors and learning insights
 * Uses NLP and pattern recognition to cluster mistakes
 */
const mistakePatternSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Individual mistake records
  mistakes: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    attemptDate: Date,
    
    // User's incorrect solution/approach
    userSolution: String,
    correctSolution: String,
    
    // Mistake classification
    mistakeType: {
      type: String,
      enum: ['conceptual', 'logical', 'implementation', 'syntax', 'edge-case', 'optimization', 'other'],
      required: true
    },
    
    // Detailed categorization
    category: {
      // Conceptual errors
      conceptualError: {
        misunderstoodConcept: String,
        correctConcept: String,
        relatedTopics: [String]
      },
      
      // Logical errors
      logicalError: {
        flawedLogic: String,
        correctLogic: String,
        algorithmicIssue: String
      },
      
      // Implementation errors
      implementationError: {
        incorrectDataStructure: String,
        offByOneError: Boolean,
        incorrectBoundary: Boolean,
        wrongLoopCondition: Boolean
      },
      
      // Edge case errors
      edgeCaseError: {
        missedEdgeCase: String,
        edgeCaseType: {
          type: String,
          enum: ['empty-input', 'single-element', 'large-input', 'negative', 'null', 'overflow', 'other']
        }
      }
    },
    
    // Severity and frequency
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'critical'],
      default: 'moderate'
    },
    repeatedCount: {
      type: Number,
      default: 1
    },
    
    // Learning status
    isResolved: {
      type: Boolean,
      default: false
    },
    resolvedDate: Date,
    
    // AI-generated insights
    aiInsights: {
      rootCause: String,
      commonPattern: String,
      learningGap: String,
      recommendedActions: [String]
    }
  }],
  
  // Aggregated patterns
  patterns: {
    // Mistake type distribution
    typeDistribution: {
      conceptual: { type: Number, default: 0 },
      logical: { type: Number, default: 0 },
      implementation: { type: Number, default: 0 },
      syntax: { type: Number, default: 0 },
      edgeCase: { type: Number, default: 0 },
      optimization: { type: Number, default: 0 }
    },
    
    // Most common mistakes
    topMistakes: [{
      pattern: String,
      count: Number,
      affectedTopics: [String],
      severity: String
    }],
    
    // Recurring patterns
    recurringPatterns: [{
      patternId: String,
      description: String,
      occurrences: Number,
      lastOccurrence: Date,
      affectedQuestions: [mongoose.Schema.Types.ObjectId]
    }],
    
    // Topic-specific weaknesses
    topicWeaknesses: {
      type: Map,
      of: {
        mistakeCount: Number,
        commonMistakes: [String],
        improvementSuggestions: [String]
      }
    }
  },
  
  // Learning insights
  insights: {
    // Conceptual gaps
    conceptualGaps: [{
      concept: String,
      relatedTopics: [String],
      mistakeCount: Number,
      severity: String,
      learningResources: [String],
      practiceQuestions: [mongoose.Schema.Types.ObjectId]
    }],
    
    // Behavioral patterns
    behavioralPatterns: {
      hastySubmission: {
        detected: Boolean,
        instances: Number,
        avgTimeBeforeError: Number // seconds
      },
      skipEdgeCases: {
        detected: Boolean,
        missedCasesCount: Number
      },
      overcomplication: {
        detected: Boolean,
        instances: Number
      },
      inefficientSolutions: {
        detected: Boolean,
        avgComplexityDelta: String // e.g., "O(n^2) instead of O(n)"
      }
    },
    
    // Improvement trajectory
    improvementMetrics: {
      mistakeRate: Number, // mistakes per question
      mistakeRateTrend: {
        type: String,
        enum: ['improving', 'stable', 'declining']
      },
      conceptualImprovementRate: Number, // 0-1
      implementationImprovementRate: Number,
      avgTimeToResolveMistake: Number // days
    }
  },
  
  // Personalized action plan
  actionPlan: [{
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    action: String,
    targetConcept: String,
    resources: [String],
    estimatedImpact: String,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    }
  }],
  
  // NLP processing metadata
  nlpMetadata: {
    lastProcessed: Date,
    processingVersion: {
      type: String,
      default: '1.0.0'
    },
    embeddingsGenerated: Boolean,
    clusteringCompleted: Boolean
  }
  
}, {
  timestamps: true
});

// Indexes
mistakePatternSchema.index({ userId: 1, 'mistakes.mistakeType': 1 });
mistakePatternSchema.index({ userId: 1, 'mistakes.isResolved': 1 });
mistakePatternSchema.index({ 'patterns.recurringPatterns.patternId': 1 });

// Methods
mistakePatternSchema.methods.getMistakeRate = function() {
  const totalMistakes = this.mistakes.length;
  const unresolvedMistakes = this.mistakes.filter(m => !m.isResolved).length;
  return { total: totalMistakes, unresolved: unresolvedMistakes };
};

mistakePatternSchema.methods.getTopWeaknesses = function(limit = 5) {
  const weaknesses = [];
  
  this.patterns.topicWeaknesses.forEach((data, topic) => {
    weaknesses.push({
      topic,
      mistakeCount: data.mistakeCount,
      severity: data.mistakeCount > 5 ? 'high' : data.mistakeCount > 2 ? 'medium' : 'low'
    });
  });
  
  weaknesses.sort((a, b) => b.mistakeCount - a.mistakeCount);
  return weaknesses.slice(0, limit);
};

mistakePatternSchema.methods.needsIntervention = function() {
  // Intervention needed if:
  // 1. More than 5 recurring patterns
  // 2. Mistake rate trend is declining
  // 3. Same critical mistake repeated 3+ times
  
  const recurringCount = this.patterns.recurringPatterns.length;
  const trendDeclining = this.insights.improvementMetrics.mistakeRateTrend === 'declining';
  const criticalRepeats = this.mistakes.filter(m => 
    m.severity === 'critical' && m.repeatedCount >= 3
  ).length;
  
  return recurringCount > 5 || trendDeclining || criticalRepeats > 0;
};

const MistakePattern = mongoose.model('MistakePattern', mistakePatternSchema);

export default MistakePattern;
