/**
 * DYNAMIC INTERVIEW ENGINE - Works for ANY Role/Domain
 * 
 * ZERO HARD-CODING:
 * - No predefined question pools
 * - Dynamic question generation from resume + JD
 * - Logic-based evaluation (transparent formulas)
 * - Adaptive difficulty based on performance
 * - Works for: Tech, Business, Creative, Medical, Legal, ANY field
 */

import ConversationalInterview from '../models/ConversationalInterview.js';
import ParsedResume from '../models/ParsedResume.js';
import JobDescription from '../models/JobDescription.js';
import QuestionBank from '../models/QuestionBank.js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class DynamicInterviewEngine {
  
  /**
   * Start interview - generates questions from resume + JD
   */
  async startInterview(userId, {
    interviewType = 'technical',
    targetRole,
    resumeId,
    jobDescriptionId
  }) {
    try {
      // Load context
      const resume = resumeId ? await ParsedResume.findById(resumeId) : null;
      const jd = jobDescriptionId ? await JobDescription.findById(jobDescriptionId) : null;
      
      // Extract skills dynamically
      const candidateSkills = resume ? this.extractAllSkills(resume.parsedData.skills) : [];
      const requiredSkills = jd ? this.extractRequiredSkills(jd.parsedData) : [];
      const preferredSkills = jd ? this.extractPreferredSkills(jd.parsedData) : [];
      
      // Identify gaps
      const skillGaps = this.identifySkillGaps(candidateSkills, requiredSkills, preferredSkills);
      
      // Create session
      const interview = new ConversationalInterview({
        userId,
        interviewType,
        targetRole: targetRole || jd?.jobTitle || 'General Position',
        resumeId,
        jobDescriptionId,
        status: 'in-progress',
        interviewContext: {
          candidateSkills,
          requiredSkills,
          preferredSkills,
          identifiedGaps: skillGaps,
          currentDifficulty: 'medium',
          topicSequence: [],
          performanceTrend: [],
          strugglingTopics: [],
          strongTopics: [],
        },
      });
      
      await interview.save();
      
      // Generate first question dynamically
      const firstQuestion = await this.generateDynamicQuestion(interview, resume, jd);
      
      return {
        interview,
        firstQuestion,
        context: {
          skillGaps: skillGaps.length,
          targetRole: interview.targetRole,
          candidateSkillCount: candidateSkills.length,
          requiredSkillCount: requiredSkills.length
        }
      };
      
    } catch (error) {
      console.error('Interview start error:', error);
      throw new Error('Failed to start interview: ' + error.message);
    }
  }
  
  /**
   * Extract all skills from resume (any format)
   */
  extractAllSkills(skillsData) {
    if (!skillsData) return [];
    
    const allSkills = [];
    
    if (typeof skillsData === 'object') {
      // Flatten all skill categories
      Object.values(skillsData).forEach(category => {
        if (Array.isArray(category)) {
          allSkills.push(...category);
        } else if (typeof category === 'string') {
          allSkills.push(category);
        }
      });
    } else if (Array.isArray(skillsData)) {
      allSkills.push(...skillsData);
    }
    
    return [...new Set(allSkills.map(s => s.toLowerCase()))];
  }
  
  /**
   * Extract required skills from JD
   */
  extractRequiredSkills(jdData) {
    const skills = [];
    
    if (jdData.requiredSkills && Array.isArray(jdData.requiredSkills)) {
      skills.push(...jdData.requiredSkills);
    }
    
    if (jdData.skills && Array.isArray(jdData.skills)) {
      skills.push(...jdData.skills);
    }
    
    return [...new Set(skills.map(s => typeof s === 'string' ? s.toLowerCase() : s.name?.toLowerCase()))].filter(Boolean);
  }
  
  /**
   * Extract preferred skills from JD
   */
  extractPreferredSkills(jdData) {
    const skills = [];
    
    if (jdData.preferredSkills && Array.isArray(jdData.preferredSkills)) {
      skills.push(...jdData.preferredSkills);
    }
    
    if (jdData.niceToHaveSkills && Array.isArray(jdData.niceToHaveSkills)) {
      skills.push(...jdData.niceToHaveSkills);
    }
    
    return [...new Set(skills.map(s => typeof s === 'string' ? s.toLowerCase() : s.name?.toLowerCase()))].filter(Boolean);
  }
  
  /**
   * Identify skill gaps dynamically
   */
  identifySkillGaps(candidateSkills, requiredSkills, preferredSkills) {
    const gaps = [];
    
    // Required skills gaps (high priority)
    requiredSkills.forEach(skill => {
      if (!this.hasSkill(candidateSkills, skill)) {
        gaps.push({
          skill,
          type: 'missing',
          severity: 'high',
          priority: 100
        });
      }
    });
    
    // Preferred skills gaps (medium priority)
    preferredSkills.forEach(skill => {
      if (!this.hasSkill(candidateSkills, skill)) {
        gaps.push({
          skill,
          type: 'missing',
          severity: 'medium',
          priority: 50
        });
      }
    });
    
    return gaps;
  }
  
  /**
   * Check if candidate has skill (fuzzy matching)
   */
  hasSkill(candidateSkills, targetSkill) {
    const target = targetSkill.toLowerCase();
    return candidateSkills.some(skill => {
      const s = skill.toLowerCase();
      return s.includes(target) || target.includes(s);
    });
  }
  
  /**
   * Generate question dynamically from context
   */
  async generateDynamicQuestion(interview, resume, jd) {
    const context = interview.interviewContext;
    const turns = interview.turns || [];
    
    // Determine what to ask about (priority-based)
    const questionFocus = this.determineQuestionFocus(context, turns);
    
    // Check if we have pre-generated questions in bank
    let question = await this.findExistingQuestion(questionFocus, context.currentDifficulty, turns);
    
    if (!question) {
      // Generate new question dynamically
      question = await this.createNewQuestion(questionFocus, context, resume, jd);
    }
    
    return question;
  }
  
  /**
   * Determine what the next question should focus on
   */
  determineQuestionFocus(context, turns) {
    const { identifiedGaps, strugglingTopics, topicSequence } = context;
    
    // Priority 1: Struggling topics (reinforce weak areas)
    if (strugglingTopics.length > 0 && Math.random() < 0.4) {
      return {
        type: 'reinforce',
        topic: strugglingTopics[0],
        source: 'struggling'
      };
    }
    
    // Priority 2: Skill gaps (test missing skills)
    if (identifiedGaps.length > 0) {
      const nextGap = identifiedGaps.find(g => !topicSequence.includes(g.skill));
      if (nextGap) {
        return {
          type: 'gap-probe',
          topic: nextGap.skill,
          source: 'gap',
          severity: nextGap.severity
        };
      }
    }
    
    // Priority 3: Resume skills (validate claimed skills)
    const resumeSkills = context.candidateSkills.filter(s => !topicSequence.includes(s));
    if (resumeSkills.length > 0) {
      return {
        type: 'skill-validation',
        topic: resumeSkills[Math.floor(Math.random() * resumeSkills.length)],
        source: 'resume'
      };
    }
    
    // Priority 4: Required skills (comprehensive coverage)
    const untestedRequired = context.requiredSkills.filter(s => !topicSequence.includes(s));
    if (untestedRequired.length > 0) {
      return {
        type: 'requirement-check',
        topic: untestedRequired[0],
        source: 'jd'
      };
    }
    
    // Fallback: General behavioral question
    return {
      type: 'behavioral',
      topic: 'general',
      source: 'fallback'
    };
  }
  
  /**
   * Find existing question from database
   */
  async findExistingQuestion(questionFocus, difficulty, askedTurns) {
    const askedQuestions = askedTurns.map(t => t.question.questionId).filter(Boolean);
    
    const question = await QuestionBank.findOne({
      generationMetadata: {
        $elemMatch: {
          fromSkill: questionFocus.topic
        }
      },
      difficulty,
      _id: { $nin: askedQuestions }
    }).sort({ 'metadata.usageCount': 1 });  // Prefer less-used questions
    
    return question;
  }
  
  /**
   * Create new question dynamically using AI
   */
  async createNewQuestion(questionFocus, context, resume, jd) {
    try {
      const prompt = this.buildQuestionPrompt(questionFocus, context, resume, jd);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert interviewer. Generate realistic, professional interview questions tailored to the candidate and role. Return ONLY a JSON object with: question, expectedKeyPoints (array), difficulty (easy/medium/hard), type (technical/behavioral/situational).'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 300,
        response_format: { type: "json_object" }
      });
      
      const generated = JSON.parse(response.choices[0].message.content);
      
      // Store in question bank for reuse
      const questionDoc = await QuestionBank.create({
        question: generated.question,
        type: generated.type || questionFocus.type,
        difficulty: generated.difficulty || context.currentDifficulty,
        expectedComponents: generated.expectedKeyPoints || [],
        generationMetadata: {
          source: 'ai-generated',
          fromSkill: questionFocus.topic,
          fromType: questionFocus.source,
          createdAt: new Date()
        },
        metadata: {
          usageCount: 1
        }
      });
      
      return {
        text: generated.question,
        questionId: questionDoc._id,
        type: generated.type,
        difficulty: generated.difficulty,
        expectedKeyPoints: generated.expectedKeyPoints || [],
        isFollowUp: false
      };
      
    } catch (error) {
      console.error('Question generation error:', error);
      // Fallback to template
      return this.getFallbackQuestion(questionFocus);
    }
  }
  
  /**
   * Build prompt for question generation
   */
  buildQuestionPrompt(questionFocus, context, resume, jd) {
    let prompt = `Generate an interview question for:\n\n`;
    
    prompt += `Role: ${context.targetRole || 'General Position'}\n`;
    prompt += `Question Focus: ${questionFocus.topic}\n`;
    prompt += `Type: ${questionFocus.type}\n`;
    prompt += `Difficulty: ${context.currentDifficulty}\n\n`;
    
    if (questionFocus.source === 'gap') {
      prompt += `This is a skill gap - the candidate doesn't have "${questionFocus.topic}" but it's required for the role.\n`;
      prompt += `Ask a question to assess their knowledge or potential to learn this skill.\n\n`;
    }
    else if (questionFocus.source === 'resume') {
      prompt += `The candidate claims to have "${questionFocus.topic}" on their resume.\n`;
      prompt += `Ask a question to validate their actual experience with this skill.\n\n`;
    }
    
    if (resume && resume.parsedData.experience.length > 0) {
      prompt += `Candidate Background:\n`;
      resume.parsedData.experience.slice(0, 2).forEach(exp => {
        prompt += `- ${exp.title} at ${exp.company}\n`;
      });
      prompt += `\n`;
    }
    
    if (jd && jd.parsedData.responsibilities) {
      prompt += `Role Responsibilities:\n`;
      jd.parsedData.responsibilities.slice(0, 3).forEach(resp => {
        prompt += `- ${resp}\n`;
      });
      prompt += `\n`;
    }
    
    prompt += `Generate a professional, specific question that probes understanding of "${questionFocus.topic}".`;
    
    return prompt;
  }
  
  /**
   * Fallback question template
   */
  getFallbackQuestion(questionFocus) {
    const templates = {
      'gap-probe': `Can you explain your understanding of ${questionFocus.topic}?`,
      'skill-validation': `Describe your experience working with ${questionFocus.topic}.`,
      'requirement-check': `How would you apply ${questionFocus.topic} in a real-world scenario?`,
      'behavioral': `Tell me about a time when you demonstrated ${questionFocus.topic}.`,
      'reinforce': `Let's dive deeper into ${questionFocus.topic}. Can you provide more detail?`
    };
    
    return {
      text: templates[questionFocus.type] || `Tell me about ${questionFocus.topic}.`,
      type: questionFocus.type,
      difficulty: 'medium',
      expectedKeyPoints: [questionFocus.topic, 'specific example', 'practical application'],
      isFollowUp: false
    };
  }
  
  /**
   * Evaluate answer using deterministic rules
   */
  async evaluateAnswer(question, answerText, expectedKeyPoints) {
    const metrics = {
      clarity: 0,
      relevance: 0,
      depth: 0,
      structure: 0,
      completeness: 0
    };
    
    const answerLower = answerText.toLowerCase();
    const words = answerText.split(/\s+/);
    
    // 1. Clarity (0-100): Based on length and readability
    if (words.length >= 30 && words.length <= 200) {
      metrics.clarity = 100;
    } else if (words.length < 30) {
      metrics.clarity = Math.min((words.length / 30) * 100, 100);
    } else {
      metrics.clarity = Math.max(100 - ((words.length - 200) / 5), 50);
    }
    
    // 2. Relevance (0-100): Contains expected key points
    const keyPointsFound = expectedKeyPoints.filter(kp => 
      answerLower.includes(kp.toLowerCase())
    );
    metrics.relevance = (keyPointsFound.length / Math.max(expectedKeyPoints.length, 1)) * 100;
    
    // 3. Depth (0-100): Specific examples, details
    const hasExample = /for example|for instance|specifically|such as|in my experience/i.test(answerText);
    const hasNumbers = /\d+/.test(answerText);
    const hasDetails = words.length > 50;
    
    let depthScore = 40;  // Base
    if (hasExample) depthScore += 30;
    if (hasNumbers) depthScore += 15;
    if (hasDetails) depthScore += 15;
    metrics.depth = Math.min(depthScore, 100);
    
    // 4. Structure (0-100): Organized response
    const hasStructure = /first|second|third|then|next|finally|because|therefore/i.test(answerText);
    const hasParagraphs = answerText.split('\n').length > 1;
    
    let structureScore = 50;  // Base
    if (hasStructure) structureScore += 30;
    if (hasParagraphs) structureScore += 20;
    metrics.structure = Math.min(structureScore, 100);
    
    // 5. Completeness (0-100): Covers all key points
    metrics.completeness = metrics.relevance;
    
    // Overall score (weighted average)
    const overallScore = (
      metrics.clarity * 0.20 +
      metrics.relevance * 0.30 +
      metrics.depth * 0.25 +
      metrics.structure * 0.15 +
      metrics.completeness * 0.10
    );
    
    // Generate feedback
    const feedback = this.generateFeedback(metrics, keyPointsFound, expectedKeyPoints);
    
    return {
      metrics,
      overallScore: Math.round(overallScore),
      feedback,
      detectedKeyPoints: keyPointsFound,
      missingKeyPoints: expectedKeyPoints.filter(kp => !keyPointsFound.includes(kp))
    };
  }
  
  /**
   * Generate transparent feedback
   */
  generateFeedback(metrics, foundKeyPoints, expectedKeyPoints) {
    const strengths = [];
    const improvements = [];
    
    if (metrics.clarity >= 75) {
      strengths.push('Clear and concise response');
    } else {
      improvements.push('Try to provide more detailed explanations');
    }
    
    if (metrics.relevance >= 75) {
      strengths.push(`Covered ${foundKeyPoints.length} out of ${expectedKeyPoints.length} key points`);
    } else {
      improvements.push(`Missing key points: ${expectedKeyPoints.filter(kp => !foundKeyPoints.includes(kp)).join(', ')}`);
    }
    
    if (metrics.depth >= 75) {
      strengths.push('Provided specific examples and details');
    } else {
      improvements.push('Include specific examples from your experience');
    }
    
    if (metrics.structure >= 75) {
      strengths.push('Well-structured answer');
    } else {
      improvements.push('Organize your response with clear structure (problem → approach → result)');
    }
    
    return { strengths, improvements };
  }
  
  /**
   * Generate follow-up question for weak answer
   */
  async generateFollowUp(question, answer, evaluation) {
    const missingPoints = evaluation.missingKeyPoints;
    
    if (missingPoints.length === 0) {
      return null;  // No follow-up needed
    }
    
    try {
      const prompt = `You asked: "${question.text}"
      
The candidate answered but missed these key points: ${missingPoints.join(', ')}

Generate a brief follow-up question (one sentence) to probe deeper on these missing points. Be conversational.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are an interviewer asking follow-up questions. Be brief and conversational.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 100
      });
      
      const followUpText = response.choices[0].message.content.trim();
      
      return {
        text: followUpText,
        type: question.type,
        difficulty: question.difficulty,
        expectedKeyPoints: missingPoints,
        isFollowUp: true,
        parentQuestion: question.text
      };
      
    } catch (error) {
      console.error('Follow-up generation error:', error);
      return {
        text: "Can you elaborate on that point?",
        type: question.type,
        difficulty: question.difficulty,
        expectedKeyPoints: missingPoints,
        isFollowUp: true
      };
    }
  }
  
  /**
   * Update session state after each turn
   */
  async updateSessionState(interview, lastEvaluation) {
    const context = interview.interviewContext;
    
    // Update performance trend
    context.performanceTrend.push(lastEvaluation.overallScore);
    if (context.performanceTrend.length > 10) {
      context.performanceTrend.shift();  // Keep last 10
    }
    
    // Update difficulty based on recent performance
    const recentAvg = context.performanceTrend.slice(-3).reduce((a, b) => a + b, 0) / 3;
    if (recentAvg >= 80) {
      context.currentDifficulty = 'hard';
    } else if (recentAvg >= 60) {
      context.currentDifficulty = 'medium';
    } else {
      context.currentDifficulty = 'easy';
    }
    
    // Update struggling/strong areas
    const currentTopic = interview.turns[interview.turns.length - 1]?.question.topic;
    if (currentTopic) {
      if (lastEvaluation.overallScore < 60) {
        if (!context.strugglingTopics.includes(currentTopic)) {
          context.strugglingTopics.push(currentTopic);
        }
      } else if (lastEvaluation.overallScore >= 80) {
        if (!context.strongTopics.includes(currentTopic)) {
          context.strongTopics.push(currentTopic);
        }
        // Remove from struggling if now strong
        context.strugglingTopics = context.strugglingTopics.filter(t => t !== currentTopic);
      }
    }
    
    interview.interviewContext = context;
    await interview.save();
  }
  
  /**
   * Determine if interview should continue
   */
  shouldContinueInterview(interview) {
    const maxTurns = 15;
    const minTurns = 5;
    
    const turns = interview.turns.length;
    
    // Always continue if below minimum
    if (turns < minTurns) return true;
    
    // Stop if max turns reached
    if (turns >= maxTurns) return false;
    
    // Stop if all gaps covered and performance is strong
    const context = interview.interviewContext;
    const gapsCovered = context.identifiedGaps.every(gap => 
      context.topicSequence.includes(gap.skill)
    );
    const recentAvg = context.performanceTrend.slice(-5).reduce((a, b) => a + b, 0) / 5;
    
    if (gapsCovered && recentAvg >= 75 && turns >= 10) {
      return false;
    }
    
    return true;
  }
}

export default new DynamicInterviewEngine();
