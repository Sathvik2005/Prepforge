import ConversationalInterview from '../models/ConversationalInterview.js';
import ParsedResume from '../models/ParsedResume.js';
import OpenAI from 'openai';

/**
 * Interview Engine Service
 * Manages conversational interviews with adaptive question selection
 * 
 * METHODOLOGY:
 * 1. Question pools organized by type/topic/difficulty
 * 2. Context-aware question selection (resume + JD + performance)
 * 3. Adaptive difficulty (starts medium, adjusts based on answers)
 * 4. Follow-up generation for weak answers (rule-based trigger)
 * 5. GPT-4 ONLY for question phrasing, NOT evaluation
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class InterviewEngineService {
  constructor() {
    // Question pools (deterministic)
    this.questionPools = {
      hr: this.buildHRQuestionPool(),
      technical: this.buildTechnicalQuestionPool(),
      behavioral: this.buildBehavioralQuestionPool(),
      coding: this.buildCodingQuestionPool(),
    };
  }
  
  /**
   * Start new interview session
   */
  async startInterview(userId, interviewType, targetRole, resumeId, jobDescriptionData) {
    try {
      // Load resume if provided
      let resumeData = null;
      if (resumeId) {
        resumeData = await ParsedResume.findById(resumeId);
      }
      
      // Create interview session
      const interview = new ConversationalInterview({
        userId,
        interviewType,
        targetRole,
        resumeId,
        jobDescription: jobDescriptionData,
        status: 'in-progress',
        interviewContext: {
          currentDifficulty: 'medium',
          topicSequence: [],
          performanceTrend: [],
          strugglingTopics: [],
          strongTopics: [],
        },
      });
      
      await interview.save();
      
      // Generate first question
      const firstQuestion = await this.generateNextQuestion(interview, resumeData);
      
      return { interview, firstQuestion };
      
    } catch (error) {
      console.error('Interview start error:', error);
      throw new Error('Failed to start interview: ' + error.message);
    }
  }
  
  /**
   * Generate next question based on context
   */
  async generateNextQuestion(interview, resume = null) {
    const { interviewType, targetRole, interviewContext, turns } = interview;
    
    // Select question pool
    const pool = this.questionPools[interviewType] || this.questionPools.hr;
    
    // Determine difficulty
    const difficulty = this.determineDifficulty(interviewContext, turns);
    
    // Select topic (adaptive)
    const topic = this.selectNextTopic(
      interviewType,
      interviewContext.topicSequence,
      interviewContext.strugglingTopics,
      resume
    );
    
    // Filter questions
    const candidates = pool.filter(q => 
      q.difficulty === difficulty &&
      q.topic === topic &&
      !turns.some(t => t.question.text === q.text)
    );
    
    if (candidates.length === 0) {
      // Fallback: any question not asked yet
      const fallback = pool.find(q => !turns.some(t => t.question.text === q.text));
      if (fallback) return this.personalizeQuestion(fallback, targetRole, resume);
    }
    
    // Select random from candidates
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    
    // Personalize with GPT-4 (phrasing only)
    return this.personalizeQuestion(selected, targetRole, resume);
  }
  
  /**
   * Personalize question using GPT-4 (language generation only)
   */
  async personalizeQuestion(baseQuestion, targetRole, resume) {
    try {
      const prompt = `You are an experienced interviewer conducting a ${targetRole} interview.
      
Base question: "${baseQuestion.text}"
Expected key points: ${baseQuestion.expectedKeyPoints.join(', ')}

${resume ? `Candidate's background:
- Skills: ${resume.parsedData.skills.programming.join(', ')}
- Experience: ${resume.parsedData.experience.map(e => e.title).join(', ')}
` : ''}

Rephrase this question naturally for a ${targetRole} position. Keep it conversational and appropriate for the role. Return ONLY the question, no explanations.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 150,
      });
      
      const personalizedText = response.choices[0].message.content.trim();
      
      return {
        text: personalizedText,
        type: baseQuestion.type,
        topic: baseQuestion.topic,
        difficulty: baseQuestion.difficulty,
        expectedKeyPoints: baseQuestion.expectedKeyPoints,
        isFollowUp: false,
      };
      
    } catch (error) {
      console.error('Question personalization error:', error);
      // Fallback to base question
      return {
        text: baseQuestion.text,
        type: baseQuestion.type,
        topic: baseQuestion.topic,
        difficulty: baseQuestion.difficulty,
        expectedKeyPoints: baseQuestion.expectedKeyPoints,
        isFollowUp: false,
      };
    }
  }
  
  /**
   * Generate follow-up question for weak answer
   */
  async generateFollowUpQuestion(parentTurn, interview) {
    const { question, evaluation } = parentTurn;
    
    // Determine follow-up focus
    let followUpType = 'depth';
    if (evaluation.relevance < 50) {
      followUpType = 'clarification';
    } else if (evaluation.depth < 60) {
      followUpType = 'example';
    }
    
    // Generate using GPT-4
    try {
      const prompt = `You are an interviewer. The candidate answered your question but needs more depth.

Original question: "${question.text}"
Candidate's answer: "${parentTurn.answer.text}"

Issue: ${evaluation.followUpReason || 'Needs more detail'}

Generate a ${followUpType} follow-up question to probe deeper. Examples:
- Clarification: "Can you explain what you mean by...?"
- Example: "Can you provide a specific example of when you..."
- Depth: "How would you handle...?"

Return ONLY the follow-up question, no explanations.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 100,
      });
      
      const followUpText = response.choices[0].message.content.trim();
      
      return {
        text: followUpText,
        type: question.type,
        topic: question.topic,
        difficulty: question.difficulty,
        expectedKeyPoints: question.expectedKeyPoints,
        isFollowUp: true,
        parentTurnNumber: parentTurn.turnNumber,
      };
      
    } catch (error) {
      console.error('Follow-up generation error:', error);
      return {
        text: "Can you provide more detail or a specific example?",
        type: question.type,
        topic: question.topic,
        difficulty: question.difficulty,
        expectedKeyPoints: question.expectedKeyPoints,
        isFollowUp: true,
        parentTurnNumber: parentTurn.turnNumber,
      };
    }
  }
  
  /**
   * Determine next difficulty level (adaptive)
   */
  determineDifficulty(context, turns) {
    if (turns.length === 0) return 'medium';
    
    // Calculate recent performance (last 3 turns)
    const recentTurns = turns.slice(-3);
    const avgScore = recentTurns.reduce((sum, t) => sum + (t.evaluation?.turnScore || 50), 0) / recentTurns.length;
    
    // Adaptive logic
    if (avgScore >= 80) return 'hard';
    if (avgScore >= 60) return 'medium';
    return 'easy';
  }
  
  /**
   * Select next topic (diverse coverage)
   */
  selectNextTopic(interviewType, topicSequence, strugglingTopics, resume) {
    const topicsByType = {
      hr: ['motivation', 'teamwork', 'conflict', 'goals', 'strengths'],
      technical: ['architecture', 'algorithms', 'system-design', 'debugging', 'optimization'],
      behavioral: ['leadership', 'communication', 'adaptability', 'problem-solving', 'ethics'],
      coding: ['data-structures', 'algorithms', 'complexity', 'testing', 'design-patterns'],
    };
    
    const availableTopics = topicsByType[interviewType] || topicsByType.hr;
    
    // Avoid recent topics
    const recentTopics = topicSequence.slice(-3);
    const candidates = availableTopics.filter(t => !recentTopics.includes(t));
    
    // Prioritize struggling topics for reinforcement
    if (strugglingTopics.length > 0) {
      const reinforcement = strugglingTopics.find(t => candidates.includes(t));
      if (reinforcement && Math.random() < 0.3) return reinforcement;
    }
    
    // Random selection
    return candidates[Math.floor(Math.random() * candidates.length)] || availableTopics[0];
  }
  
  /**
   * Build HR question pool
   */
  buildHRQuestionPool() {
    return [
      // Motivation
      {
        text: "Why are you interested in this position?",
        type: 'hr',
        topic: 'motivation',
        difficulty: 'easy',
        expectedKeyPoints: ['company research', 'role alignment', 'career goals'],
      },
      {
        text: "What attracted you to our company?",
        type: 'hr',
        topic: 'motivation',
        difficulty: 'medium',
        expectedKeyPoints: ['company values', 'products', 'culture'],
      },
      
      // Teamwork
      {
        text: "Tell me about a time you worked on a team.",
        type: 'hr',
        topic: 'teamwork',
        difficulty: 'easy',
        expectedKeyPoints: ['collaboration', 'communication', 'contribution'],
      },
      {
        text: "How do you handle disagreements with team members?",
        type: 'hr',
        topic: 'conflict',
        difficulty: 'medium',
        expectedKeyPoints: ['communication', 'compromise', 'resolution'],
      },
      {
        text: "Describe a situation where you had to resolve a conflict in your team.",
        type: 'hr',
        topic: 'conflict',
        difficulty: 'hard',
        expectedKeyPoints: ['mediation', 'empathy', 'outcome'],
      },
      
      // Goals
      {
        text: "Where do you see yourself in 5 years?",
        type: 'hr',
        topic: 'goals',
        difficulty: 'easy',
        expectedKeyPoints: ['career path', 'skill development', 'ambition'],
      },
      
      // Strengths/Weaknesses
      {
        text: "What are your greatest strengths?",
        type: 'hr',
        topic: 'strengths',
        difficulty: 'easy',
        expectedKeyPoints: ['specific skills', 'examples', 'relevance'],
      },
      {
        text: "Tell me about a weakness and how you're working to improve it.",
        type: 'hr',
        topic: 'strengths',
        difficulty: 'medium',
        expectedKeyPoints: ['self-awareness', 'improvement plan', 'progress'],
      },
    ];
  }
  
  /**
   * Build Technical question pool
   */
  buildTechnicalQuestionPool() {
    return [
      // Architecture
      {
        text: "Explain the difference between monolithic and microservices architecture.",
        type: 'technical',
        topic: 'architecture',
        difficulty: 'medium',
        expectedKeyPoints: ['monolithic', 'microservices', 'trade-offs', 'scalability'],
      },
      {
        text: "How would you design a scalable web application?",
        type: 'technical',
        topic: 'system-design',
        difficulty: 'hard',
        expectedKeyPoints: ['load balancing', 'caching', 'database', 'architecture'],
      },
      
      // Algorithms
      {
        text: "Explain the concept of Big O notation.",
        type: 'technical',
        topic: 'algorithms',
        difficulty: 'easy',
        expectedKeyPoints: ['time complexity', 'space complexity', 'examples'],
      },
      {
        text: "What are the trade-offs between different sorting algorithms?",
        type: 'technical',
        topic: 'algorithms',
        difficulty: 'medium',
        expectedKeyPoints: ['quicksort', 'mergesort', 'time complexity', 'use cases'],
      },
      
      // Debugging
      {
        text: "How do you approach debugging a production issue?",
        type: 'technical',
        topic: 'debugging',
        difficulty: 'medium',
        expectedKeyPoints: ['logs', 'monitoring', 'reproduction', 'fix verification'],
      },
      
      // Optimization
      {
        text: "How would you optimize a slow database query?",
        type: 'technical',
        topic: 'optimization',
        difficulty: 'hard',
        expectedKeyPoints: ['indexing', 'query plan', 'caching', 'denormalization'],
      },
    ];
  }
  
  /**
   * Build Behavioral question pool
   */
  buildBehavioralQuestionPool() {
    return [
      // Leadership
      {
        text: "Tell me about a time you led a project.",
        type: 'behavioral',
        topic: 'leadership',
        difficulty: 'medium',
        expectedKeyPoints: ['project scope', 'team management', 'outcome'],
      },
      
      // Communication
      {
        text: "Describe a situation where you had to explain a complex technical concept to a non-technical person.",
        type: 'behavioral',
        topic: 'communication',
        difficulty: 'medium',
        expectedKeyPoints: ['simplification', 'analogies', 'understanding check'],
      },
      
      // Adaptability
      {
        text: "Tell me about a time you had to learn a new technology quickly.",
        type: 'behavioral',
        topic: 'adaptability',
        difficulty: 'easy',
        expectedKeyPoints: ['learning approach', 'timeline', 'application'],
      },
      
      // Problem-solving
      {
        text: "Describe a challenging technical problem you solved.",
        type: 'behavioral',
        topic: 'problem-solving',
        difficulty: 'medium',
        expectedKeyPoints: ['problem analysis', 'solution approach', 'result'],
      },
    ];
  }
  
  /**
   * Build Coding question pool
   */
  buildCodingQuestionPool() {
    return [
      // Data structures
      {
        text: "Implement a function to reverse a linked list.",
        type: 'coding',
        topic: 'data-structures',
        difficulty: 'medium',
        expectedKeyPoints: ['iteration', 'pointers', 'edge cases'],
      },
      {
        text: "How would you detect a cycle in a linked list?",
        type: 'coding',
        topic: 'data-structures',
        difficulty: 'medium',
        expectedKeyPoints: ['two pointers', 'Floyd algorithm', 'complexity'],
      },
      
      // Algorithms
      {
        text: "Write a function to find the first non-repeating character in a string.",
        type: 'coding',
        topic: 'algorithms',
        difficulty: 'easy',
        expectedKeyPoints: ['hash map', 'iteration', 'time complexity'],
      },
      
      // Design patterns
      {
        text: "When would you use the Singleton pattern?",
        type: 'coding',
        topic: 'design-patterns',
        difficulty: 'medium',
        expectedKeyPoints: ['use cases', 'implementation', 'trade-offs'],
      },
    ];
  }
}

export default new InterviewEngineService();
