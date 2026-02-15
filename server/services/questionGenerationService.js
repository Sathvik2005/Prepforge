import QuestionBank from '../models/QuestionBank.js';
import SkillGap from '../models/SkillGap.js';
import JobDescription from '../models/JobDescription.js';
import ParsedResume from '../models/ParsedResume.js';
import * as openrouterService from './openrouterService.js';

/**
 * QuestionGenerationService
 * Dynamically generates interview questions based on:
 * 1. Skills from resume
 * 2. Identified gaps
 * 3. Job description requirements
 * 4. Previous answer quality (follow-ups)
 * 
 * ZERO HARD-CODING - All questions generated from data
 */

class QuestionGenerationService {
  /**
   * Generate skill-based verification question
   * Tests if candidate truly knows a skill listed on their resume
   */
  static async generateSkillBasedQuestion(skill, resumeContext, difficulty = 'medium') {
    // Check if cached question exists
    let question = await QuestionBank.findOne({
      'generationSource.method': 'skill-based',
      'generationSource.sourceData.skill': skill,
      difficulty,
      isActive: true,
    });
    
    if (question) {
      question.recordUsage(0, []);
      await question.save();
      return question;
    }
    
    // Generate new question using GPT-4
    const prompt = `Generate a technical interview question to verify knowledge of: ${skill}

Context: The candidate listed this skill on their resume in the following context:
${resumeContext}

Requirements:
- Question should verify ACTUAL understanding, not just familiarity
- Difficulty level: ${difficulty}
- Should require explanation with examples
- Should test practical application, not just definitions

Return a JSON object with this structure:
{
  "question": "the interview question",
  "requiredConcepts": ["concept1", "concept2"],
  "optionalConcepts": ["concept3"],
  "keyTerms": ["term1", "term2"],
  "depthIndicators": ["phrase indicating deep understanding"],
  "followUpQuestions": ["follow-up if answer is shallow", "another follow-up"]
}`;

    const response = await openrouterService.createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert technical interviewer. Generate questions that truly assess understanding, not memorization.',
      },
      { role: 'user', content: prompt },
    ], {
      temperature: 0.7,
      max_tokens: 500
    });
    
    const generated = JSON.parse(response.content);
    
    // Store in QuestionBank
    question = new QuestionBank({
      question: generated.question,
      type: 'technical',
      difficulty,
      generationSource: {
        method: 'skill-based',
        sourceData: { skill },
        generatedAt: new Date(),
        generationPrompt: prompt,
        targetedConcepts: [skill],
      },
      expectedComponents: {
        requiredConcepts: generated.requiredConcepts || [skill],
        optionalConcepts: generated.optionalConcepts || [],
        keyTerms: generated.keyTerms || [],
        depthIndicators: generated.depthIndicators || [],
        idealStructure: {
          hasDefinition: true,
          hasExample: true,
          hasUseCase: true,
          hasTradeOff: false,
        },
      },
      followUpLogic: {
        deepeningQuestions: generated.followUpQuestions || [],
      },
      usageStats: {
        timesAsked: 1,
        lastUsed: new Date(),
      },
    });
    
    await question.save();
    return question;
  }
  
  /**
   * Generate gap-based probing question
   * Targets identified weaknesses to verify and quantify the gap
   */
  static async generateGapBasedQuestion(gapId) {
    const gap = await SkillGap.findById(gapId);
    if (!gap) throw new Error('Gap not found');
    
    // Check if cached question exists
    let question = await QuestionBank.findOne({
      'generationSource.method': 'gap-based',
      'generationSource.sourceData.gapId': gapId,
      isActive: true,
    });
    
    if (question) {
      question.recordUsage(0, []);
      await question.save();
      return question;
    }
    
    // Generate new question targeting this specific gap
    const difficulty = gap.severity === 'critical' ? 'hard' :
                       gap.severity === 'high' ? 'medium' : 'easy';
    
    const prompt = `Generate an interview question to assess a skill gap.

Gap Details:
- Skill: ${gap.skill}
- Gap Type: ${gap.gapType}
- Severity: ${gap.severity}
- Evidence: ${JSON.stringify(gap.evidence, null, 2)}

${gap.gapType === 'knowledge-gap' ? 'The candidate does not know this skill.' :
  gap.gapType === 'explanation-gap' ? 'The candidate knows this but cannot explain it well.' :
  gap.gapType === 'depth-gap' ? 'The candidate has superficial knowledge but lacks depth.' :
  'The candidate has some familiarity but needs verification.'}

Generate a question that will:
1. Verify the gap exists
2. Measure the severity accurately
3. ${gap.gapType === 'explanation-gap' ? 'Test explanation ability, not just knowledge' : 'Test actual understanding'}

Return JSON:
{
  "question": "the question",
  "requiredConcepts": ["must mention these"],
  "depthIndicators": ["phrases showing true understanding"],
  "followUpQuestions": ["if shallow answer", "if missing key concepts"]
}`;

    const response = await openrouterService.createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert at identifying skill gaps through targeted questions.',
      },
      { role: 'user', content: prompt },
    ], {
      temperature: 0.7,
      max_tokens: 500
    });
    
    const generated = JSON.parse(response.content);
    
    question = new QuestionBank({
      question: generated.question,
      type: 'technical',
      difficulty,
      generationSource: {
        method: 'gap-based',
        sourceData: { gapId, skill: gap.skill },
        generatedAt: new Date(),
        generationPrompt: prompt,
        targetedConcepts: [gap.skill],
      },
      expectedComponents: {
        requiredConcepts: generated.requiredConcepts || [gap.skill],
        depthIndicators: generated.depthIndicators || [],
        idealStructure: {
          hasDefinition: gap.gapType === 'knowledge-gap',
          hasExample: true,
          hasUseCase: gap.gapType === 'depth-gap',
          hasTradeOff: difficulty === 'hard',
        },
      },
      followUpLogic: {
        deepeningQuestions: generated.followUpQuestions || [],
      },
      adaptiveData: {
        detectsGaps: [gap.gapType],
      },
      usageStats: {
        timesAsked: 1,
        lastUsed: new Date(),
      },
    });
    
    await question.save();
    return question;
  }
  
  /**
   * Generate JD-aligned question
   * Tests skills required by the job description
   */
  static async generateJDAlignedQuestion(jobDescriptionId, targetSkill) {
    const jd = await JobDescription.findById(jobDescriptionId);
    if (!jd) throw new Error('Job description not found');
    
    // Check cache
    let question = await QuestionBank.findOne({
      'generationSource.method': 'jd-aligned',
      'generationSource.sourceData.jobDescriptionId': jobDescriptionId,
      'generationSource.sourceData.skill': targetSkill,
      isActive: true,
    });
    
    if (question) {
      question.recordUsage(0, []);
      await question.save();
      return question;
    }
    
    // Determine if skill is required or preferred
    const allRequired = jd.getAllRequiredSkills();
    const allPreferred = jd.getAllPreferredSkills();
    const isRequired = allRequired.includes(targetSkill);
    const difficulty = isRequired ? 'medium' : 'easy';
    
    const prompt = `Generate an interview question for a ${jd.jobTitle} position.

Job Description Context:
- Company: ${jd.companyName}
- Role: ${jd.jobTitle}
- Required Skills: ${allRequired.join(', ')}
- Preferred Skills: ${allPreferred.join(', ')}
- Key Responsibilities: ${jd.responsibilities.slice(0, 3).join('; ')}

Target Skill: ${targetSkill} (${isRequired ? 'REQUIRED' : 'PREFERRED'})

Generate a question that:
1. Tests this skill in the context of this specific role
2. Relates to the job responsibilities
3. Assesses real-world application for this position

Return JSON:
{
  "question": "the question",
  "requiredConcepts": ["concepts specific to this role"],
  "keyTerms": ["industry-specific terms"],
  "followUpQuestions": ["contextual follow-ups"]
}`;

    const response = await openrouterService.createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert recruiter crafting role-specific interview questions.',
      },
      { role: 'user', content: prompt },
    ], {
      temperature: 0.7,
      max_tokens: 500
    });
    
    const generated = JSON.parse(response.content);
    
    question = new QuestionBank({
      question: generated.question,
      type: 'technical',
      difficulty,
      generationSource: {
        method: 'jd-aligned',
        sourceData: { jobDescriptionId, skill: targetSkill },
        generatedAt: new Date(),
        generationPrompt: prompt,
        targetedConcepts: [targetSkill],
      },
      expectedComponents: {
        requiredConcepts: generated.requiredConcepts || [targetSkill],
        keyTerms: generated.keyTerms || [],
        idealStructure: {
          hasDefinition: false,
          hasExample: true,
          hasUseCase: true,
          hasTradeOff: false,
        },
      },
      followUpLogic: {
        deepeningQuestions: generated.followUpQuestions || [],
      },
      usageStats: {
        timesAsked: 1,
        lastUsed: new Date(),
      },
    });
    
    await question.save();
    return question;
  }
  
  /**
   * Generate follow-up question based on previous answer quality
   * Probes deeper when answer is shallow or vague
   */
  static async generateFollowUpQuestion(previousQuestion, previousAnswer, answerEvaluation) {
    const prompt = `Generate a follow-up interview question.

Previous Question: ${previousQuestion}
Candidate's Answer: ${previousAnswer}

Answer Quality Assessment:
- Clarity: ${answerEvaluation.clarity}/100
- Relevance: ${answerEvaluation.relevance}/100
- Depth: ${answerEvaluation.depth}/100
- Structure: ${answerEvaluation.structure}/100

Issues Identified:
${answerEvaluation.clarity < 60 ? '- Answer was unclear or rambling' : ''}
${answerEvaluation.relevance < 60 ? '- Answer did not address the question' : ''}
${answerEvaluation.depth < 60 ? '- Answer lacked depth and examples' : ''}
${answerEvaluation.missingConcepts ? `- Missing concepts: ${answerEvaluation.missingConcepts.join(', ')}` : ''}

Generate a follow-up question that:
1. Probes the specific weakness identified
2. Gives the candidate a chance to demonstrate understanding
3. Is respectful but direct

Return JSON:
{
  "question": "the follow-up question",
  "targetingWeakness": "which specific weakness this addresses",
  "requiredConcepts": ["what should be in a good answer"]
}`;

    const response = await openrouterService.createChatCompletion([
      {
        role: 'system',
        content: 'You are an interviewer following up on a weak answer. Be professional and give the candidate a fair opportunity.',
      },
      { role: 'user', content: prompt },
    ], {
      temperature: 0.7,
      max_tokens: 300
    });
    
    const generated = JSON.parse(response.content);
    
    const question = new QuestionBank({
      question: generated.question,
      type: 'technical',
      difficulty: 'medium',
      generationSource: {
        method: 'follow-up',
        sourceData: {
          previousAnswer,
        },
        generatedAt: new Date(),
        generationPrompt: prompt,
      },
      expectedComponents: {
        requiredConcepts: generated.requiredConcepts || [],
      },
      usageStats: {
        timesAsked: 1,
        lastUsed: new Date(),
      },
    });
    
    await question.save();
    return question;
  }
  
  /**
   * Select next question intelligently based on interview state
   * Core algorithm for adaptive questioning
   */
  static async selectNextQuestion(interviewState) {
    const {
      resumeId,
      jobDescriptionId,
      topicsCovered,
      skillsProbed,
      strugglingAreas,
      difficultyLevel,
      currentTurn,
    } = interviewState;
    
    const resume = await ParsedResume.findById(resumeId);
    const jd = jobDescriptionId ? await JobDescription.findById(jobDescriptionId) : null;
    
    // Strategy selection based on state
    
    // 1. If struggling, probe the gap
    if (strugglingAreas.length > 0 && currentTurn > 2) {
      const strugglingSkill = strugglingAreas[0];
      const gap = await SkillGap.findOne({
        userId: resume.userId,
        skill: strugglingSkill,
        status: 'identified',
      });
      
      if (gap) {
        return await this.generateGapBasedQuestion(gap._id);
      }
    }
    
    // 2. If JD provided, test required skills not yet probed
    if (jd) {
      const requiredSkills = jd.getAllRequiredSkills();
      const untestedSkills = requiredSkills.filter(s => !skillsProbed.includes(s));
      
      if (untestedSkills.length > 0) {
        const skill = untestedSkills[0];
        return await this.generateJDAlignedQuestion(jd._id, skill);
      }
    }
    
    // 3. Test resume skills not yet verified
    const resumeSkills = resume.getAllSkills();
    const untestedResumeSkills = resumeSkills.filter(s => !skillsProbed.includes(s));
    
    if (untestedResumeSkills.length > 0) {
      const skill = untestedResumeSkills[0];
      const context = `Listed in ${resume.skills.programmingLanguages.includes(skill) ? 'programming languages' : 'skills'}`;
      return await this.generateSkillBasedQuestion(skill, context, difficultyLevel);
    }
    
    // 4. Default: pick most effective unused question
    const effective = await QuestionBank.getEffectiveQuestions('technical', difficultyLevel, 5);
    if (effective.length > 0) {
      return effective[0];
    }
    
    // 5. Fallback: general question
    return await this.generateSkillBasedQuestion('problem-solving', 'General skill', difficultyLevel);
  }
}

export default QuestionGenerationService;
