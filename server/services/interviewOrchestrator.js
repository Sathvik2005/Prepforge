import ConversationalInterview from '../models/ConversationalInterview.js';
import InterviewProgress from '../models/InterviewProgress.js';
import QuestionGenerationService from './questionGenerationService.js';
import EvaluationEngine from './evaluationEngine.js';
import SkillGap from '../models/SkillGap.js';
import ParsedResume from '../models/ParsedResume.js';
import JobDescription from '../models/JobDescription.js';

/**
 * InterviewOrchestrator
 * Real-time interview session management with adaptive questioning
 * NO HARD-CODED LOGIC - All decisions based on dynamic state
 */

class InterviewOrchestrator {
  /**
   * Initialize a new interview session
   */
  static async startSession({ userId, resumeId, jobDescriptionId, interviewType = 'technical' }) {
    const resume = await ParsedResume.findById(resumeId);
    if (!resume) throw new Error('Resume not found');
    
    const jd = jobDescriptionId ? await JobDescription.findById(jobDescriptionId) : null;
    
    // Determine target role
    const targetRole = jd ? jd.jobTitle : 'General Technical Role';
    
    // Get existing gaps
    const existingGaps = await SkillGap.find({
      userId,
      status: { $in: ['identified', 'in-progress'] },
    }).sort({ severity: -1 });
    
    // Initialize session
    const session = new ConversationalInterview({
      userId,
      resumeId,
      jobDescriptionId,
      interviewType,
      
      // Context
      context: {
        targetRole,
        candidateSkills: resume.getAllSkills(),
        requiredSkills: jd ? jd.getAllRequiredSkills() : [],
        preferredSkills: jd ? jd.getAllPreferredSkills() : [],
        identifiedGaps: existingGaps.map(g => g.skill),
      },
      
      // Initial state
      state: {
        currentTurn: 0,
        topicsCovered: [],
        skillsProbed: [],
        difficultyLevel: 'medium',
        confidenceEstimate: 50,
        strugglingAreas: [],
        strongAreas: [],
      },
      
      status: 'in-progress',
    });
    
    await session.save();
    
    // Get first question
    const firstQuestion = await this.getNextQuestion(session);
    
    return {
      sessionId: session._id,
      question: firstQuestion.question,
      questionId: firstQuestion._id,
      context: session.context,
      state: session.state,
    };
  }
  
  /**
   * Process answer and get next question
   * Core adaptive interview loop
   */
  static async processAnswer(sessionId, answer, timeSpent) {
    const session = await ConversationalInterview.findById(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status !== 'in-progress') throw new Error('Session is not active');
    
    // Get current question
    const currentTurn = session.turns[session.turns.length - 1];
    if (!currentTurn) throw new Error('No active question');
    
    // Evaluate answer
    const evaluation = await EvaluationEngine.evaluateAnswer(
      currentTurn.question,
      answer,
      currentTurn.expectedComponents
    );
    
    // Update turn with evaluation
    currentTurn.answer = answer;
    currentTurn.timeSpent = timeSpent;
    currentTurn.evaluation = {
      clarity: evaluation.metrics.clarity,
      relevance: evaluation.metrics.relevance,
      depth: evaluation.metrics.depth,
      structure: evaluation.metrics.structure,
      technicalAccuracy: evaluation.metrics.technicalAccuracy,
      overallScore: evaluation.overallScore,
      feedback: evaluation.feedback,
      detectedConcepts: evaluation.extractedConcepts.concepts,
      missingConcepts: evaluation.gaps.filter(g => g.type === 'knowledge-gap').map(g => g.skill),
    };
    
    // Create gap records if needed
    if (evaluation.gaps.length > 0) {
      await EvaluationEngine.createGapRecords(
        session.userId,
        session.resumeId,
        session.jobDescriptionId,
        session._id,
        evaluation.gaps
      );
    }
    
    // Update session state
    await this.updateSessionState(session, currentTurn);
    
    // Save session
    await session.save();
    
    // Decide next action
    const shouldContinue = this.shouldContinueInterview(session);
    
    if (!shouldContinue) {
      return await this.concludeSession(session);
    }
    
    // Get next question (adaptive)
    const nextQuestion = await this.getNextQuestion(session);
    
    return {
      evaluation: {
        score: evaluation.overallScore,
        feedback: evaluation.feedback,
        metrics: evaluation.metrics,
      },
      nextQuestion: {
        question: nextQuestion.question,
        questionId: nextQuestion._id,
      },
      sessionState: session.state,
      shouldContinue: true,
    };
  }
  
  /**
   * Get next question using adaptive strategy
   */
  static async getNextQuestion(session) {
    // Prepare interview state
    const interviewState = {
      resumeId: session.resumeId,
      jobDescriptionId: session.jobDescriptionId,
      topicsCovered: session.state.topicsCovered,
      skillsProbed: session.state.skillsProbed,
      strugglingAreas: session.state.strugglingAreas,
      difficultyLevel: session.state.difficultyLevel,
      currentTurn: session.state.currentTurn,
    };
    
    // Check if follow-up is needed
    if (session.turns.length > 0) {
      const lastTurn = session.turns[session.turns.length - 1];
      if (lastTurn.evaluation && lastTurn.evaluation.overallScore < 60) {
        // Generate follow-up
        const followUpQuestion = await QuestionGenerationService.generateFollowUpQuestion(
          lastTurn.question,
          lastTurn.answer,
          lastTurn.evaluation
        );
        
        // Add question to session
        session.turns.push({
          questionId: followUpQuestion._id,
          question: followUpQuestion.question,
          expectedComponents: followUpQuestion.expectedComponents,
          askedAt: new Date(),
        });
        
        session.state.currentTurn += 1;
        await session.save();
        
        return followUpQuestion;
      }
    }
    
    // Get adaptive next question
    const question = await QuestionGenerationService.selectNextQuestion(interviewState);
    
    // Add question to session
    session.turns.push({
      questionId: question._id,
      question: question.question,
      expectedComponents: question.expectedComponents,
      askedAt: new Date(),
    });
    
    session.state.currentTurn += 1;
    await session.save();
    
    return question;
  }
  
  /**
   * Update session state based on last answer
   */
  static async updateSessionState(session, lastTurn) {
    const evaluation = lastTurn.evaluation;
    
    // Update topics covered (extract from question)
    const questionConcepts = lastTurn.expectedComponents?.requiredConcepts || [];
    for (const concept of questionConcepts) {
      if (!session.state.topicsCovered.includes(concept)) {
        session.state.topicsCovered.push(concept);
      }
    }
    
    // Update skills probed
    for (const skill of questionConcepts) {
      if (!session.state.skillsProbed.includes(skill)) {
        session.state.skillsProbed.push(skill);
      }
    }
    
    // Update struggling/strong areas
    if (evaluation.overallScore < 50) {
      for (const skill of questionConcepts) {
        if (!session.state.strugglingAreas.includes(skill)) {
          session.state.strugglingAreas.push(skill);
        }
      }
    } else if (evaluation.overallScore >= 80) {
      for (const skill of questionConcepts) {
        if (!session.state.strongAreas.includes(skill)) {
          session.state.strongAreas.push(skill);
        }
      }
    }
    
    // Adjust difficulty based on performance
    const recentScores = session.turns
      .slice(-3)
      .filter(t => t.evaluation)
      .map(t => t.evaluation.overallScore);
    
    if (recentScores.length >= 2) {
      const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      
      if (avgRecent >= 85 && session.state.difficultyLevel !== 'hard') {
        session.state.difficultyLevel = 'hard';
      } else if (avgRecent < 50 && session.state.difficultyLevel !== 'easy') {
        session.state.difficultyLevel = 'easy';
      }
    }
    
    // Update confidence estimate
    if (recentScores.length > 0) {
      const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      session.state.confidenceEstimate = Math.round(avgRecent);
    }
  }
  
  /**
   * Determine if interview should continue
   */
  static shouldContinueInterview(session) {
    // Stop conditions
    
    // 1. Max turns reached
    if (session.state.currentTurn >= 15) return false;
    
    // 2. Minimum turns not met
    if (session.state.currentTurn < 5) return true;
    
    // 3. Check coverage
    const resume = session.context.candidateSkills || [];
    const required = session.context.requiredSkills || [];
    const probed = session.state.skillsProbed || [];
    
    // If less than 50% of critical skills probed, continue
    const criticalSkills = required.length > 0 ? required : resume.slice(0, 10);
    const probedCritical = criticalSkills.filter(s => probed.includes(s));
    
    if (probedCritical.length < criticalSkills.length * 0.5) {
      return true;
    }
    
    // 4. If recent performance is very poor, continue to give more chances
    const recentScores = session.turns
      .slice(-3)
      .filter(t => t.evaluation)
      .map(t => t.evaluation.overallScore);
    
    if (recentScores.length > 0) {
      const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      
      // If doing poorly, allow more turns to improve
      if (avgRecent < 60 && session.state.currentTurn < 10) {
        return true;
      }
    }
    
    // Default: sufficient coverage, can conclude
    return false;
  }
  
  /**
   * Conclude interview and generate final evaluation
   */
  static async concludeSession(session) {
    // Calculate final scores
    const scores = session.turns
      .filter(t => t.evaluation)
      .map(t => t.evaluation.overallScore);
    
    const overallScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    
    // Calculate category scores
    const categoryScores = {
      clarity: 0,
      relevance: 0,
      depth: 0,
      structure: 0,
      technicalAccuracy: 0,
    };
    
    if (scores.length > 0) {
      const validTurns = session.turns.filter(t => t.evaluation);
      for (const turn of validTurns) {
        categoryScores.clarity += turn.evaluation.clarity;
        categoryScores.relevance += turn.evaluation.relevance;
        categoryScores.depth += turn.evaluation.depth;
        categoryScores.structure += turn.evaluation.structure;
        categoryScores.technicalAccuracy += turn.evaluation.technicalAccuracy;
      }
      
      const count = validTurns.length;
      for (const key in categoryScores) {
        categoryScores[key] = Math.round(categoryScores[key] / count);
      }
    }
    
    // Get all identified gaps
    const gaps = await SkillGap.find({
      userId: session.userId,
      interviewSessionId: session._id,
    });
    
    // Calculate readiness score
    const readinessScore = this.calculateReadiness(overallScore, gaps.length, categoryScores);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(session, gaps, categoryScores);
    
    // Update session
    session.status = 'completed';
    session.completedAt = new Date();
    session.finalEvaluation = {
      overallScore,
      categoryScores,
      identifiedGaps: gaps.map(g => ({
        skill: g.skill,
        type: g.gapType,
        severity: g.severity,
      })),
      readinessScore,
      readinessLevel: this.getReadinessLevel(readinessScore),
      recommendations,
    };
    
    await session.save();
    
    // Update progress tracking
    await this.updateProgressTracking(session);
    
    return {
      sessionComplete: true,
      finalEvaluation: session.finalEvaluation,
      totalTurns: session.state.currentTurn,
      duration: Math.round((session.completedAt - session.createdAt) / 1000 / 60), // minutes
    };
  }
  
  /**
   * Calculate readiness score
   */
  static calculateReadiness(overallScore, gapCount, categoryScores) {
    let readiness = overallScore;
    
    // Penalize for gaps
    readiness -= Math.min(gapCount * 5, 30);
    
    // Bonus for balanced performance
    const scores = Object.values(categoryScores);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const variance = max - min;
    
    if (variance < 15) {
      readiness += 10; // Consistent across all areas
    }
    
    return Math.max(0, Math.min(100, Math.round(readiness)));
  }
  
  /**
   * Get readiness level label
   */
  static getReadinessLevel(score) {
    if (score >= 80) return 'highly-confident';
    if (score >= 65) return 'interview-ready';
    if (score >= 40) return 'needs-improvement';
    return 'not-ready';
  }
  
  /**
   * Generate actionable recommendations
   */
  static generateRecommendations(session, gaps, categoryScores) {
    const recommendations = [];
    
    // Category-specific recommendations
    if (categoryScores.clarity < 60) {
      recommendations.push({
        area: 'Communication',
        priority: 'high',
        action: 'Practice explaining concepts out loud. Record yourself and review for clarity.',
      });
    }
    
    if (categoryScores.depth < 60) {
      recommendations.push({
        area: 'Depth of Knowledge',
        priority: 'high',
        action: 'For each skill, prepare 2-3 concrete examples from your experience.',
      });
    }
    
    if (categoryScores.structure < 60) {
      recommendations.push({
        area: 'Answer Structure',
        priority: 'medium',
        action: 'Use the STAR method: Situation, Task, Action, Result for behavioral questions.',
      });
    }
    
    // Gap-specific recommendations
    const criticalGaps = gaps.filter(g => g.severity === 'critical' || g.severity === 'high');
    
    for (const gap of criticalGaps.slice(0, 3)) {
      recommendations.push({
        area: gap.skill,
        priority: 'high',
        action: gap.gapType === 'knowledge-gap'
          ? `Study ${gap.skill} fundamentals and build a small project`
          : `Practice explaining ${gap.skill} with examples and use cases`,
      });
    }
    
    return recommendations;
  }
  
  /**
   * Update longitudinal progress tracking
   */
  static async updateProgressTracking(session) {
    const progress = await InterviewProgress.getOrCreate(
      session.userId,
      session.context.targetRole
    );
    
    // Add session to history
    progress.addSession({
      sessionId: session._id,
      date: session.completedAt,
      type: session.interviewType,
      overallScore: session.finalEvaluation.overallScore,
      readinessScore: session.finalEvaluation.readinessScore,
      duration: Math.round((session.completedAt - session.createdAt) / 1000 / 60),
      questionCount: session.turns.length,
    });
    
    // Update topic mastery
    for (const topic of session.state.topicsCovered) {
      const topicTurns = session.turns.filter(t =>
        t.expectedComponents?.requiredConcepts?.includes(topic)
      );
      
      if (topicTurns.length > 0) {
        const avgScore = topicTurns.reduce((sum, t) =>
          sum + (t.evaluation?.overallScore || 0), 0) / topicTurns.length;
        
        progress.updateTopicMastery(topic, 'technical', avgScore);
      }
    }
    
    // Update readiness
    const readiness = progress.calculateReadiness();
    progress.readinessHistory.push({
      date: new Date(),
      readinessScore: readiness.readinessScore,
      readinessLevel: readiness.readinessLevel,
      factors: {
        technicalReadiness: session.finalEvaluation.categoryScores.technicalAccuracy,
        communicationReadiness: (session.finalEvaluation.categoryScores.clarity + session.finalEvaluation.categoryScores.structure) / 2,
        confidenceLevel: session.state.confidenceEstimate,
        gapCount: session.finalEvaluation.identifiedGaps.length,
      },
    });
    
    progress.currentStatus = {
      readinessLevel: readiness.readinessLevel,
      openGaps: session.finalEvaluation.identifiedGaps.length,
      criticalGaps: session.finalEvaluation.identifiedGaps.filter(g => g.severity === 'critical').length,
      confidenceScore: session.state.confidenceEstimate,
    };
    
    // Analyze improvement
    progress.analyzeImprovement();
    
    await progress.save();
  }
}

export default InterviewOrchestrator;
