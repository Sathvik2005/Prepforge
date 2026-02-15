/**
 * Universal Skill Gap Analysis Service
 * Domain-agnostic skill gap analyzer for any role or industry
 */

import { createChatCompletion } from './aiProvider.js';

/**
 * Analyze skill gaps between resume and job requirements
 * Works universally across all domains: tech, business, healthcare, finance, design, etc.
 * 
 * @param {string} resumeText - Parsed resume content
 * @param {string} jobDescription - Target job description
 * @param {string} targetRole - Optional target role for context
 * @returns {Promise<Object>} Structured skill gap analysis
 */
export async function analyzeSkillGap(resumeText, jobDescription, targetRole = '') {
  const prompt = buildSkillGapPrompt(resumeText, jobDescription, targetRole);

  try {
    console.log('🔍 Starting universal skill gap analysis...');

    const response = await createChatCompletion([
      {
        role: 'system',
        content: `You are an expert career analyst and skill assessment specialist with deep expertise across ALL industries and domains including:
- Technology (Software Engineering, Data Science, DevOps, Cybersecurity)
- Business (Management, Finance, Marketing, Sales, Operations)
- Healthcare (Clinical, Administrative, Research)
- Design (UX/UI, Graphic Design, Product Design)
- Engineering (Mechanical, Civil, Electrical, Industrial)
- Education & Training
- Legal & Compliance
- Creative & Media
- And all other professional domains

Your task is to perform domain-agnostic skill gap analysis that:
1. Works for ANY job role across ANY industry
2. Identifies technical AND soft skills gaps
3. Provides actionable, specific recommendations
4. Considers domain-specific competencies
5. Returns structured, parseable JSON output`
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: 0.6, // Balance between creativity and precision
      max_tokens: 3000
    }, {
      feature: 'skill-gap-analysis',
      skipCache: false
    });

    const skillGapData = parseSkillGapResponse(response.content);
    
    console.log(`✅ Skill gap analysis complete via ${response.provider}`);
    console.log(`   Match Score: ${skillGapData.matchScore}%`);
    console.log(`   Matched: ${skillGapData.matchedSkills.length}, Missing: ${skillGapData.missingSkills.length}`);

    return {
      success: true,
      data: skillGapData,
      metadata: {
        provider: response.provider,
        cached: response.cached,
        model: response.model
      }
    };

  } catch (error) {
    console.error('❌ Skill gap analysis failed:', error);

    // Return fallback rule-based skill gap analysis
    return {
      success: true,
      data: generateFallbackSkillGap(resumeText, jobDescription),
      metadata: {
        provider: 'rule-based-fallback',
        cached: false,
        degradedMode: true
      }
    };
  }
}

/**
 * Build comprehensive skill gap analysis prompt
 */
function buildSkillGapPrompt(resumeText, jobDescription, targetRole) {
  return `**UNIVERSAL SKILL GAP ANALYSIS**

**CANDIDATE RESUME:**
${resumeText}

**TARGET JOB DESCRIPTION:**
${jobDescription}

${targetRole ? `**TARGET ROLE:** ${targetRole}\n` : ''}

**ANALYSIS TASK:**

Perform a comprehensive, domain-agnostic skill gap analysis. This analysis must work for ANY role in ANY industry (tech, business, healthcare, finance, creative, etc.).

**REQUIRED OUTPUT (STRICT JSON FORMAT):**

\`\`\`json
{
  "matchScore": 75,
  "overallAssessment": "2-3 sentence summary of overall match quality and main findings",
  "matchedSkills": [
    {
      "skill": "Specific skill name",
      "category": "Technical|Soft|Tool|Domain|Certification",
      "proficiencyLevel": "Beginner|Intermediate|Advanced|Expert",
      "evidenceFromResume": "Quote or reference from resume showing this skill"
    }
  ],
  "missingSkills": [
    {
      "skill": "Specific missing skill name",
      "category": "Technical|Soft|Tool|Domain|Certification",
      "priority": "Critical|High|Medium|Low",
      "requiredLevel": "Beginner|Intermediate|Advanced|Expert",
      "reason": "Why this skill is important for the role"
    }
  ],
  "partialCoverage": [
    {
      "skill": "Skill name",
      "currentLevel": "Current proficiency",
      "requiredLevel": "Required proficiency",
      "gap": "Specific gap description",
      "improvementAction": "How to bridge this gap"
    }
  ],
  "recommendedUpskilling": [
    {
      "area": "Skill or competency area",
      "priority": "Critical|High|Medium|Low",
      "reason": "Why to focus on this",
      "suggestedResources": ["Resource 1", "Resource 2"],
      "estimatedTime": "Time to acquire proficiency"
    }
  ],
  "experienceAlignment": {
    "yearsRequired": "X-Y years",
    "yearsInResume": "X years",
    "match": "Strong|Moderate|Weak",
    "gaps": ["Specific experience gap 1", "Gap 2"]
  },
  "certificationGaps": [
    {
      "certification": "Certification name",
      "importance": "Required|Preferred|Nice-to-have",
      "alternatives": ["Alternative cert 1", "Alternative 2"]
    }
  ],
  "strengthsToEmphasize": [
    "Unique strength/skill that stands out and should be highlighted in interviews"
  ],
  "resumeImprovementSuggestions": [
    {
      "area": "What to improve",
      "suggestion": "Specific actionable recommendation",
      "example": "Concrete example of improvement"
    }
  ],
  "keywordOptimization": {
    "criticalKeywordsMissing": ["keyword1", "keyword2"],
    "keywordsToAdd": ["Where and how to add missing keywords"],
    "atsScore": 0-100
  },
  "readinessAssessment": {
    "currentReadiness": "0-100%",
    "timeToReadiness": "Estimated time to become job-ready",
    "quickWins": ["Fast improvements that boost match"],
    "longTermGoals": ["Skills requiring extended learning"]
  }
}
\`\`\`

**CRITICAL INSTRUCTIONS:**

1. **DOMAIN-AGNOSTIC**: Adapt analysis to ANY role/industry automatically
2. **BE SPECIFIC**: Use exact skill names from the JD, not generic categories
3. **EVIDENCE-BASED**: Reference specific parts of resume for matched skills
4. **ACTIONABLE**: Give concrete steps, not vague advice
5. **COMPREHENSIVE**: Cover technical skills, soft skills, tools, domain knowledge, certifications
6. **HONEST**: If match is weak, say so. If strong, highlight it.
7. **STRUCTURED**: Return ONLY valid JSON, no extra text

**EXAMPLES OF SKILLS ACROSS DOMAINS:**
- Tech: Python, React, AWS, Machine Learning, Agile, CI/CD
- Business: Strategy Planning, Budget Management, Stakeholder Communication
- Healthcare: Patient Care, HIPAA Compliance, Medical Terminology
- Design: Figma, User Research, Prototyping, Design Systems
- Finance: Financial Modeling, Risk Analysis, Bloomberg Terminal
- Legal: Contract Negotiation, Regulatory Compliance

Generate the complete skill gap analysis now:`;
}

/**
 * Parse AI response into structured skill gap data
 */
function parseSkillGapResponse(content) {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    const parsed = JSON.parse(jsonString);

    // Validate and normalize structure
    return {
      matchScore: parsed.matchScore || 0,
      overallAssessment: parsed.overallAssessment || 'Analysis completed',
      matchedSkills: (parsed.matchedSkills || []).map(s => ({
        skill: s.skill || 'Unknown',
        category: s.category || 'General',
        proficiencyLevel: s.proficiencyLevel || 'Unknown',
        evidenceFromResume: s.evidenceFromResume || 'N/A'
      })),
      missingSkills: (parsed.missingSkills || []).map(s => ({
        skill: s.skill || 'Unknown',
        category: s.category || 'General',
        priority: s.priority || 'Medium',
        requiredLevel: s.requiredLevel || 'Intermediate',
        reason: s.reason || 'Required for role'
      })),
      partialCoverage: (parsed.partialCoverage || []).map(s => ({
        skill: s.skill || 'Unknown',
        currentLevel: s.currentLevel || 'Beginner',
        requiredLevel: s.requiredLevel || 'Advanced',
        gap: s.gap || 'Needs improvement',
        improvementAction: s.improvementAction || 'Practice and training'
      })),
      recommendedUpskilling: (parsed.recommendedUpskilling || []).map(r => ({
        area: r.area || 'General',
        priority: r.priority || 'Medium',
        reason: r.reason || 'Valuable for growth',
        suggestedResources: r.suggestedResources || [],
        estimatedTime: r.estimatedTime || 'Varies'
      })),
      experienceAlignment: parsed.experienceAlignment || {
        yearsRequired: 'Not specified',
        yearsInResume: 'Not specified',
        match: 'Unknown',
        gaps: []
      },
      certificationGaps: (parsed.certificationGaps || []).map(c => ({
        certification: c.certification || 'Unknown',
        importance: c.importance || 'Preferred',
        alternatives: c.alternatives || []
      })),
      strengthsToEmphasize: parsed.strengthsToEmphasize || [],
      resumeImprovementSuggestions: (parsed.resumeImprovementSuggestions || []).map(s => ({
        area: s.area || 'General',
        suggestion: s.suggestion || 'Review and improve',
        example: s.example || 'N/A'
      })),
      keywordOptimization: parsed.keywordOptimization || {
        criticalKeywordsMissing: [],
        keywordsToAdd: [],
        atsScore: 0
      },
      readinessAssessment: parsed.readinessAssessment || {
        currentReadiness: '0%',
        timeToReadiness: 'Unknown',
        quickWins: [],
        longTermGoals: []
      }
    };
  } catch (error) {
    console.error('Error parsing skill gap response:', error);
    console.error('Raw content:', content);
    
    // Return minimal valid structure
    return {
      matchScore: 0,
      overallAssessment: 'Unable to parse detailed analysis',
      matchedSkills: [],
      missingSkills: [],
      partialCoverage: [],
      recommendedUpskilling: [],
      experienceAlignment: {
        yearsRequired: 'Unknown',
        yearsInResume: 'Unknown',
        match: 'Unknown',
        gaps: []
      },
      certificationGaps: [],
      strengthsToEmphasize: [],
      resumeImprovementSuggestions: [],
      keywordOptimization: {
        criticalKeywordsMissing: [],
        keywordsToAdd: [],
        atsScore: 0
      },
      readinessAssessment: {
        currentReadiness: '0%',
        timeToReadiness: 'Unknown',
        quickWins: [],
        longTermGoals: []
      }
    };
  }
}

/**
 * Generate fallback rule-based skill gap analysis
 */
function generateFallbackSkillGap(resumeText, jobDescription) {
  console.log('⚠️ Using rule-based fallback for skill gap analysis');

  // Simple keyword extraction
  const jdKeywords = extractKeywords(jobDescription);
  const resumeKeywords = extractKeywords(resumeText);

  const matched = jdKeywords.filter(k => resumeKeywords.includes(k));
  const missing = jdKeywords.filter(k => !resumeKeywords.includes(k));

  const matchScore = jdKeywords.length > 0 
    ? Math.round((matched.length / jdKeywords.length) * 100)
    : 0;

  return {
    matchScore,
    overallAssessment: `Based on keyword analysis, your resume matches ${matchScore}% of the job requirements. ${
      matchScore >= 70 ? 'Strong match!' : matchScore >= 50 ? 'Moderate match with room for improvement.' : 'Significant skill gaps identified.'
    }`,
    matchedSkills: matched.slice(0, 10).map(skill => ({
      skill,
      category: 'General',
      proficiencyLevel: 'Unknown',
      evidenceFromResume: 'Mentioned in resume'
    })),
    missingSkills: missing.slice(0, 10).map(skill => ({
      skill,
      category: 'General',
      priority: 'Medium',
      requiredLevel: 'Intermediate',
      reason: 'Required in job description'
    })),
    partialCoverage: [],
    recommendedUpskilling: missing.slice(0, 5).map(skill => ({
      area: skill,
      priority: 'Medium',
      reason: 'Missing from resume but required in JD',
      suggestedResources: ['Online courses', 'Official documentation'],
      estimatedTime: '2-4 weeks'
    })),
    experienceAlignment: {
      yearsRequired: 'Not specified',
      yearsInResume: 'Not specified',
      match: 'Unknown',
      gaps: []
    },
    certificationGaps: [],
    strengthsToEmphasize: matched.slice(0, 3),
    resumeImprovementSuggestions: [
      {
        area: 'Keyword Optimization',
        suggestion: 'Add missing keywords from job description',
        example: `Include terms like: ${missing.slice(0, 3).join(', ')}`
      }
    ],
    keywordOptimization: {
      criticalKeywordsMissing: missing.slice(0, 5),
      keywordsToAdd: [`Add these to relevant sections: ${missing.slice(0, 5).join(', ')}`],
      atsScore: matchScore
    },
    readinessAssessment: {
      currentReadiness: `${matchScore}%`,
      timeToReadiness: matchScore >= 70 ? '1-2 weeks' : matchScore >= 50 ? '1-2 months' : '3-6 months',
      quickWins: ['Update resume with missing keywords', 'Highlight relevant experience'],
      longTermGoals: missing.slice(0, 3).map(s => `Learn ${s}`)
    }
  };
}

/**
 * Simple keyword extraction helper
 */
function extractKeywords(text) {
  if (!text) return [];

  // Common technical and professional terms
  const keywords = text.match(/\b[A-Z][a-z]*(?:\s[A-Z][a-z]*)*\b|\b[A-Z]{2,}\b|\b[a-z]+(?:\.[a-z]+)+\b/g) || [];
  
  // Remove common words
  const stopWords = new Set(['The', 'And', 'For', 'With', 'This', 'That', 'From', 'Have', 'Will', 'Been', 'Are', 'Were', 'Was', 'Has', 'Had']);
  
  return [...new Set(keywords)]
    .filter(k => k.length > 2 && !stopWords.has(k))
    .slice(0, 50);
}

export default {
  analyzeSkillGap
};
