/**
 * IMPROVED REAL-TIME INTERVIEW ORCHESTRATOR
 * 
 * Manages WebSocket-based live interviews with:
 * - Dynamic question generation (NO hard-coding)
 * - Real-time evaluation with transparent metrics
 * - Adaptive difficulty and follow-ups
 * - Automatic gap detection and recording
 * - Works for ANY role/domain
 */

import ConversationalInterview from '../models/ConversationalInterview.js';
import ParsedResume from '../models/ParsedResume.js';
import JobDescription from '../models/JobDescription.js';
import SkillGap from '../models/SkillGap.js';
import DynamicInterviewEngine from './dynamicInterviewEngine.js';

class ImprovedInterviewOrchestrator {
  
  /**
   * Start new real-time interview session
   */
  async startSession({
    userId,
    resumeId,
    jobDescriptionId,
    interviewType = 'technical',
    socketId
  }) {
    try {
      // Validate inputs
      if (!userId) throw new Error('userId is required');
      if (!resumeId) throw new Error('resumeId is required');
      
      // Load resume and JD
      const resume = await ParsedResume.findById(resumeId);
      if (!resume) throw new Error('Resume not found');
      
      const jd = jobDescriptionId ? await JobDescription.findById(jobDescriptionId) : null;
      
      // Determine target role
      const targetRole = jd?.jobTitle || resume.parsedData.summary?.targetRole || 'General Position';
      
      // Start interview using dynamic engine
      const result = await DynamicInterviewEngine.startInterview(userId, {
        interviewType,
        targetRole,
        resumeId,
        jobDescriptionId
      });
      
      // Store socket mapping for real-time updates
      const interview = result.interview;
      interview.socketId = socketId;
      interview.status = 'active';
      interview.startedAt = new Date();
      
      // Add first turn
      interview.turns.push({
        turnNumber: 1,
        question: result.firstQuestion,
        askedAt: new Date(),
        answer: null,
        evaluation: null
      });
      
      await interview.save();
      
      return {
        sessionId: interview._id,
        question: result.firstQuestion,
        context: {
          targetRole,
          skillGapsIdentified: result.context.skillGaps,
          currentDifficulty: 'medium',
          turnNumber: 1
        },
        metadata: {
          candidateSkills: result.context.candidateSkillCount,
          requiredSkills: result.context.requiredSkillCount,
          totalGaps: result.context.skillGaps
        }
      };
      
    } catch (error) {
      console.error('Session start error:', error);
      throw new Error('Failed to start interview session: ' + error.message);
    }
  }
  
  /**
   * Process candidate's answer in real-time
   */
  async processAnswer({
    sessionId,
    answer,
    timeSpent = 0,
    mediaId = null,
    mediaDuration = 0,
    mediaSize = 0
  }) {
    try {
      // Load session
      const interview = await ConversationalInterview.findById(sessionId);
      if (!interview) throw new Error('Interview session not found');
      
      if (interview.status !== 'active') {
        throw new Error('Interview is not active');
      }
      
      // Get current turn
      const currentTurn = interview.turns[interview.turns.length - 1];
      if (!currentTurn) throw new Error('No active question found');
      
      if (currentTurn.answer !== null) {
        throw new Error('Question already answered');
      }
      
      // Evaluate answer using deterministic rules
      const evaluation = await DynamicInterviewEngine.evaluateAnswer(
        currentTurn.question,
        answer,
        currentTurn.question.expectedKeyPoints || []
      );
      
      // Update turn with answer and evaluation
      currentTurn.answer = answer;
      currentTurn.answeredAt = new Date();
      currentTurn.timeSpent = timeSpent;
      
      // Add media reference if provided
      if (mediaId) {
        currentTurn.media = {
          mediaId,
          duration: mediaDuration,
          size: mediaSize,
          type: 'video/webm'
        };
      }
      
      currentTurn.evaluation = {
        clarity: evaluation.metrics.clarity,
        relevance: evaluation.metrics.relevance,
        depth: evaluation.metrics.depth,
        structure: evaluation.metrics.structure,
        completeness: evaluation.metrics.completeness,
        overallScore: evaluation.overallScore,
        detectedKeyPoints: evaluation.detectedKeyPoints,
        missingKeyPoints: evaluation.missingKeyPoints,
        feedback: evaluation.feedback
      };
      
      // Update topic sequence
      const questionTopic = this.extractTopicFromQuestion(currentTurn.question);
      if (questionTopic) {
        interview.interviewContext.topicSequence.push(questionTopic);
      }
      
      // Record skill gaps if answer was weak
      if (evaluation.overallScore < 60 && evaluation.missingKeyPoints.length > 0) {
        await this.createGapRecords(interview, evaluation.missingKeyPoints, evaluation.overallScore);
      }
      
      // Update session state
      await DynamicInterviewEngine.updateSessionState(interview, evaluation);
      
      // Decide next action
      let nextQuestion = null;
      let shouldContinue = DynamicInterviewEngine.shouldContinueInterview(interview);
      
      if (!shouldContinue) {
        // Conclude interview
        interview.status = 'completed';
        interview.completedAt = new Date();
        await interview.save();
        
        const summary = await this.generateSummary(interview);
        
        return {
          type: 'interview_complete',
          evaluation: currentTurn.evaluation,
          summary,
          sessionId: interview._id
        };
      }
      
      // Check if follow-up needed (weak answer)
      if (evaluation.overallScore < 60 && evaluation.missingKeyPoints.length > 0) {
        nextQuestion = await DynamicInterviewEngine.generateFollowUp(
          currentTurn.question,
          answer,
          evaluation
        );
        
        if (nextQuestion) {
          // Add follow-up turn
          interview.turns.push({
            turnNumber: interview.turns.length + 1,
            question: nextQuestion,
            askedAt: new Date(),
            answer: null,
            evaluation: null
          });
          
          await interview.save();
          
          return {
            type: 'follow_up',
            evaluation: currentTurn.evaluation,
            nextQuestion,
            context: {
              isFollowUp: true,
              turnNumber: interview.turns.length,
              currentDifficulty: interview.interviewContext.currentDifficulty
            }
          };
        }
      }
      
      // Generate next question
      const resume = await ParsedResume.findById(interview.resumeId);
      const jd = interview.jobDescriptionId ? await JobDescription.findById(interview.jobDescriptionId) : null;
      
      nextQuestion = await DynamicInterviewEngine.generateDynamicQuestion(interview, resume, jd);
      
      // Add new turn
      interview.turns.push({
        turnNumber: interview.turns.length + 1,
        question: nextQuestion,
        askedAt: new Date(),
        answer: null,
        evaluation: null
      });
      
      await interview.save();
      
      return {
        type: 'next_question',
        evaluation: currentTurn.evaluation,
        nextQuestion,
        context: {
          turnNumber: interview.turns.length,
          currentDifficulty: interview.interviewContext.currentDifficulty,
          topicsCovered: interview.interviewContext.topicSequence.length,
          strugglingAreas: interview.interviewContext.strugglingTopics,
          strongAreas: interview.interviewContext.strongTopics
        }
      };
      
    } catch (error) {
      console.error('Answer processing error:', error);
      throw new Error('Failed to process answer: ' + error.message);
    }
  }
  
  /**
   * Extract topic from question for tracking
   */
  extractTopicFromQuestion(question) {
    // Try to get topic from question metadata
    if (question.topic) return question.topic;
    
    // Extract from expectedKeyPoints
    if (question.expectedKeyPoints && question.expectedKeyPoints.length > 0) {
      return question.expectedKeyPoints[0];
    }
    
    // Extract from question text (first significant noun)
    const words = question.text.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'your', 'you', 'how', 'what', 'why', 'when', 'where', 'can', 'tell', 'me', 'about'];
    const topic = words.find(w => !stopWords.includes(w) && w.length > 3);
    
    return topic || 'general';
  }
  
  /**
   * Create skill gap records
   */
  async createGapRecords(interview, missingSkills, score) {
    try {
      const gapRecords = missingSkills.map(skill => ({
        userId: interview.userId,
        resumeId: interview.resumeId,
        jobDescriptionId: interview.jobDescriptionId,
        interviewSessionId: interview._id,
        skill,
        gapType: 'knowledge-gap',
        severity: score < 40 ? 'high' : score < 60 ? 'medium' : 'low',
        identifiedAt: new Date(),
        status: 'identified',
        detectionSource: 'live-interview',
        evidence: {
          interviewQuestion: interview.turns[interview.turns.length - 1]?.question.text,
          evaluationScore: score
        }
      }));
      
      await SkillGap.insertMany(gapRecords);
      
      console.log(`Created ${gapRecords.length} gap records for session ${interview._id}`);
    } catch (error) {
      console.error('Gap record creation error:', error);
      // Don't throw - gap recording is non-critical
    }
  }
  
  /**
   * Get interview session details
   */
  async getSession(sessionId) {
    try {
      const interview = await ConversationalInterview.findById(sessionId)
        .populate('resumeId', 'name parsedData.personalInfo')
        .populate('jobDescriptionId', 'jobTitle company');
      
      if (!interview) throw new Error('Interview session not found');
      
      return {
        sessionId: interview._id,
        status: interview.status,
        targetRole: interview.targetRole,
        interviewType: interview.interviewType,
        turnCount: interview.turns.length,
        startedAt: interview.startedAt,
        completedAt: interview.completedAt,
        context: {
          currentDifficulty: interview.interviewContext.currentDifficulty,
          topicsCovered: interview.interviewContext.topicSequence,
          strugglingAreas: interview.interviewContext.strugglingTopics,
          strongAreas: interview.interviewContext.strongTopics,
          performanceTrend: interview.interviewContext.performanceTrend
        },
        currentQuestion: interview.turns.find(t => t.answer === null)?.question || null
      };
      
    } catch (error) {
      console.error('Session retrieval error:', error);
      throw new Error('Failed to retrieve session: ' + error.message);
    }
  }
  
  /**
   * End interview early
   */
  async endSession(sessionId) {
    try {
      const interview = await ConversationalInterview.findById(sessionId);
      if (!interview) throw new Error('Interview session not found');
      
      interview.status = 'terminated';
      interview.completedAt = new Date();
      await interview.save();
      
      const summary = await this.generateSummary(interview);
      
      return {
        sessionId: interview._id,
        status: 'terminated',
        summary
      };
      
    } catch (error) {
      console.error('Session termination error:', error);
      throw new Error('Failed to end session: ' + error.message);
    }
  }
  
  /**
   * Generate comprehensive interview summary
   */
  async generateSummary(interview) {
    const answeredTurns = interview.turns.filter(t => t.answer !== null);
    
    if (answeredTurns.length === 0) {
      return {
        totalQuestions: 0,
        averageScore: 0,
        strengthAreas: [],
        improvementAreas: [],
        recommendation: 'No questions answered'
      };
    }
    
    // Calculate metrics
    const scores = answeredTurns.map(t => t.evaluation?.overallScore || 0);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    const metricAverages = {
      clarity: answeredTurns.reduce((sum, t) => sum + (t.evaluation?.clarity || 0), 0) / answeredTurns.length,
      relevance: answeredTurns.reduce((sum, t) => sum + (t.evaluation?.relevance || 0), 0) / answeredTurns.length,
      depth: answeredTurns.reduce((sum, t) => sum + (t.evaluation?.depth || 0), 0) / answeredTurns.length,
      structure: answeredTurns.reduce((sum, t) => sum + (t.evaluation?.structure || 0), 0) / answeredTurns.length,
      completeness: answeredTurns.reduce((sum, t) => sum + (t.evaluation?.completeness || 0), 0) / answeredTurns.length
    };
    
    // Identify strengths and weaknesses
    const strengthAreas = [];
    const improvementAreas = [];
    
    Object.entries(metricAverages).forEach(([metric, score]) => {
      if (score >= 75) {
        strengthAreas.push({
          area: metric.charAt(0).toUpperCase() + metric.slice(1),
          score: Math.round(score)
        });
      } else if (score < 60) {
        improvementAreas.push({
          area: metric.charAt(0).toUpperCase() + metric.slice(1),
          score: Math.round(score),
          suggestion: this.getImprovementSuggestion(metric)
        });
      }
    });
    
    // Topic-based analysis
    const topicScores = {};
    answeredTurns.forEach(turn => {
      const topic = this.extractTopicFromQuestion(turn.question);
      if (!topicScores[topic]) topicScores[topic] = [];
      topicScores[topic].push(turn.evaluation?.overallScore || 0);
    });
    
    const strongTopics = [];
    const weakTopics = [];
    
    Object.entries(topicScores).forEach(([topic, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg >= 75) {
        strongTopics.push({ topic, averageScore: Math.round(avg) });
      } else if (avg < 60) {
        weakTopics.push({ topic, averageScore: Math.round(avg) });
      }
    });
    
    // Overall recommendation
    let recommendation = '';
    if (averageScore >= 80) {
      recommendation = 'Excellent performance! Strong candidate for the role.';
    } else if (averageScore >= 65) {
      recommendation = 'Good performance with room for improvement in specific areas.';
    } else if (averageScore >= 50) {
      recommendation = 'Moderate performance. Recommend focused learning in weak areas.';
    } else {
      recommendation = 'Needs significant improvement. Consider foundational learning.';
    }
    
    return {
      totalQuestions: answeredTurns.length,
      averageScore: Math.round(averageScore),
      metricBreakdown: Object.entries(metricAverages).map(([key, value]) => ({
        metric: key.charAt(0).toUpperCase() + key.slice(1),
        score: Math.round(value)
      })),
      strengthAreas: strengthAreas.length > 0 ? strengthAreas : strongTopics.slice(0, 3),
      improvementAreas: improvementAreas.length > 0 ? improvementAreas : weakTopics.slice(0, 3),
      topicPerformance: {
        strong: strongTopics,
        weak: weakTopics
      },
      recommendation,
      duration: interview.completedAt 
        ? Math.round((interview.completedAt - interview.startedAt) / 1000 / 60) 
        : 0,
      skillGapsIdentified: interview.interviewContext.strugglingTopics.length
    };
  }
  
  /**
   * Get improvement suggestion for metric
   */
  getImprovementSuggestion(metric) {
    const suggestions = {
      clarity: 'Practice articulating your thoughts in a structured manner before answering',
      relevance: 'Focus on addressing the specific question asked and include required key points',
      depth: 'Provide specific examples and details from your experience to support your answers',
      structure: 'Use frameworks like STAR (Situation, Task, Action, Result) to organize responses',
      completeness: 'Ensure you cover all aspects of the question before concluding your answer'
    };
    
    return suggestions[metric] || 'Focus on improving this aspect of your interview responses';
  }
  
  /**
   * Get interview analytics
   */
  async getAnalytics(userId, filters = {}) {
    try {
      const query = { userId };
      
      if (filters.status) query.status = filters.status;
      if (filters.interviewType) query.interviewType = filters.interviewType;
      if (filters.dateFrom) query.startedAt = { $gte: new Date(filters.dateFrom) };
      if (filters.dateTo) {
        query.startedAt = query.startedAt || {};
        query.startedAt.$lte = new Date(filters.dateTo);
      }
      
      const interviews = await ConversationalInterview.find(query)
        .sort({ startedAt: -1 })
        .limit(50);
      
      // Aggregate statistics
      const completed = interviews.filter(i => i.status === 'completed');
      const totalQuestions = completed.reduce((sum, i) => sum + i.turns.filter(t => t.answer).length, 0);
      const totalScore = completed.reduce((sum, i) => {
        const answeredTurns = i.turns.filter(t => t.evaluation);
        const avgScore = answeredTurns.length > 0
          ? answeredTurns.reduce((s, t) => s + (t.evaluation.overallScore || 0), 0) / answeredTurns.length
          : 0;
        return sum + avgScore;
      }, 0);
      
      return {
        totalInterviews: interviews.length,
        completedInterviews: completed.length,
        averageScore: completed.length > 0 ? Math.round(totalScore / completed.length) : 0,
        totalQuestionsAnswered: totalQuestions,
        recentInterviews: interviews.slice(0, 10).map(i => ({
          sessionId: i._id,
          targetRole: i.targetRole,
          status: i.status,
          startedAt: i.startedAt,
          turnCount: i.turns.length
        }))
      };
      
    } catch (error) {
      console.error('Analytics retrieval error:', error);
      throw new Error('Failed to retrieve analytics: ' + error.message);
    }
  }
}

export default new ImprovedInterviewOrchestrator();
