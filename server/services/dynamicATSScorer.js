/**
 * Dynamic ATS Scorer Service
 * Role-aware resume scoring with TF-IDF keyword analysis and achievement detection
 * 
 * SDP Justification:
 * - Transparent scoring formulas (all weights documented)
 * - Role-specific evaluation criteria based on industry research
 * - Deterministic results (same input = same output)
 */

/**
 * Role category weight configurations
 * Based on industry hiring priorities
 */
const roleWeights = {
  'software-engineering': {
    skills: 0.35,        // Technical skills most important
    experience: 0.25,
    education: 0.15,
    projects: 0.15,      // Projects matter for engineers
    keywords: 0.10,
    description: 'Software/Full-stack Development roles',
  },
  'data-science': {
    skills: 0.30,
    experience: 0.20,
    education: 0.25,     // Advanced degrees common
    projects: 0.15,
    keywords: 0.10,
    description: 'Data Science/ML/AI roles',
  },
  'product-management': {
    skills: 0.20,        // Soft skills matter more
    experience: 0.35,    // Experience critical
    education: 0.15,
    projects: 0.10,
    keywords: 0.20,      // Communication/strategy keywords
    description: 'Product Manager/Program Manager roles',
  },
  'frontend-engineering': {
    skills: 0.35,
    experience: 0.25,
    education: 0.10,
    projects: 0.20,      // Portfolio/projects very important
    keywords: 0.10,
    description: 'Frontend/UI/UX Engineering roles',
  },
  'backend-engineering': {
    skills: 0.35,
    experience: 0.25,
    education: 0.15,
    projects: 0.15,
    keywords: 0.10,
    description: 'Backend/Systems/Infrastructure roles',
  },
  'devops': {
    skills: 0.30,
    experience: 0.30,
    education: 0.10,
    projects: 0.15,
    keywords: 0.15,
    description: 'DevOps/SRE/Cloud roles',
  },
  'design': {
    skills: 0.25,
    experience: 0.25,
    education: 0.10,
    projects: 0.30,      // Portfolio is king
    keywords: 0.10,
    description: 'UI/UX Design roles',
  },
  'generic': {
    skills: 0.30,
    experience: 0.25,
    education: 0.20,
    projects: 0.15,
    keywords: 0.10,
    description: 'General technical roles',
  },
};

/**
 * Detect role category from resume and job description
 * @param {object} resume - Parsed resume data
 * @param {string} jdText - Job description text
 * @returns {string} Role category
 */
export function detectRoleCategory(resume, jdText) {
  const combinedText = (jdText + ' ' + JSON.stringify(resume)).toLowerCase();
  
  const categoryKeywords = {
    'software-engineering': ['software engineer', 'full stack', 'fullstack', 'backend developer', 'software developer'],
    'data-science': ['data scientist', 'machine learning', 'ml engineer', 'ai engineer', 'data analyst'],
    'product-management': ['product manager', 'program manager', 'product owner', 'scrum master'],
    'frontend-engineering': ['frontend', 'front-end', 'react developer', 'angular developer', 'ui engineer'],
    'backend-engineering': ['backend', 'back-end', 'api developer', 'server engineer', 'systems engineer'],
    'devops': ['devops', 'sre', 'site reliability', 'cloud engineer', 'infrastructure engineer'],
    'design': ['ui designer', 'ux designer', 'product designer', 'visual designer'],
  };
  
  let bestMatch = 'generic';
  let maxMatches = 0;
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const matches = keywords.filter(keyword => combinedText.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = category;
    }
  }
  
  return bestMatch;
}

/**
 * Get role-specific weights
 * @param {string} roleCategory - Detected role category
 * @returns {object} Weight configuration
 */
export function getRoleWeights(roleCategory) {
  return roleWeights[roleCategory] || roleWeights['generic'];
}

/**
 * Calculate TF-IDF score for keywords
 * @param {object} resume - Parsed resume
 * @param {string} jdText - Job description text
 * @returns {object} Keyword scoring results
 */
export function scoreKeywordsWithContext(resume, jdText) {
  // Extract keywords from JD
  const jdWords = extractKeywords(jdText);
  
  // Calculate term frequency in resume
  const resumeText = JSON.stringify(resume).toLowerCase();
  const resumeWords = extractKeywords(resumeText);
  
  // Calculate match with diminishing returns
  let totalScore = 0;
  let matchedKeywords = [];
  let missingKeywords = [];
  
  jdWords.forEach(({ term, importance }) => {
    const resumeCount = resumeWords.filter(w => w.term === term).length;
    
    if (resumeCount > 0) {
      // Diminishing returns: 1st mention = 100%, 2nd = 75%, 3rd = 50%, 4th+ = 25%
      const diminishingReturns = [1.0, 0.75, 0.5, 0.25];
      let termScore = 0;
      
      for (let i = 0; i < Math.min(resumeCount, 4); i++) {
        termScore += diminishingReturns[i] * importance;
      }
      
      totalScore += termScore;
      matchedKeywords.push({ term, count: resumeCount, score: termScore });
    } else {
      missingKeywords.push({ term, importance });
    }
  });
  
  // Normalize score to 0-100
  const maxPossibleScore = jdWords.reduce((sum, kw) => sum + kw.importance, 0);
  const normalizedScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  
  return {
    score: Math.round(normalizedScore),
    matchedKeywords,
    missingKeywords,
    totalJDKeywords: jdWords.length,
    matchRate: (matchedKeywords.length / jdWords.length * 100).toFixed(1),
  };
}

/**
 * Extract important keywords from text using TF-IDF heuristic
 * @param {string} text - Input text
 * @returns {Array} Keywords with importance scores
 */
function extractKeywords(text) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  ]);
  
  // Tokenize and filter
  const words = text
    .toLowerCase()
    .replace(/[^\w\s+-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  // Count term frequency
  const termFrequency = {};
  words.forEach(word => {
    termFrequency[word] = (termFrequency[word] || 0) + 1;
  });
  
  // Calculate importance (simplified TF-IDF)
  const keywords = Object.entries(termFrequency)
    .map(([term, freq]) => {
      // Higher frequency = higher importance, but with logarithmic scaling
      const importance = Math.log2(freq + 1) * 10;
      return { term, frequency: freq, importance: Math.min(importance, 50) };
    })
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 50); // Top 50 keywords
  
  return keywords;
}

/**
 * Score quantifiable achievements in resume
 * @param {object} resume - Parsed resume
 * @returns {object} Achievement scoring
 */
export function scoreAchievements(resume) {
  const achievementPatterns = [
    { pattern: /(\d+)%\s*(increase|improvement|reduction|growth|decrease)/gi, type: 'percentage' },
    { pattern: /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(million|billion|k|saved|revenue|budget)/gi, type: 'monetary' },
    { pattern: /(\d+)x\s*(faster|improvement|increase|growth)/gi, type: 'multiplier' },
    { pattern: /(led|managed|built|created|designed|implemented)\s+(\d+)/gi, type: 'quantified_action' },
    { pattern: /(\d+(?:,\d{3})*)\s*(users|customers|clients|requests|transactions)/gi, type: 'scale' },
  ];
  
  const achievements = [];
  let totalScore = 0;
  
  // Search in experience and projects
  const searchSections = [
    ...(resume.parsedData?.experience || []).flatMap(exp => exp.responsibilities || []),
    ...(resume.parsedData?.experience || []).flatMap(exp => exp.achievements || []),
    ...(resume.parsedData?.projects || []).map(proj => proj.description || ''),
  ];
  
  searchSections.forEach(text => {
    if (!text) return;
    
    achievementPatterns.forEach(({ pattern, type }) => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        achievements.push({
          type,
          text: match[0],
          context: text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + 100)),
        });
        
        // Score based on type
        const scoreMap = {
          percentage: 15,
          monetary: 20,
          multiplier: 18,
          quantified_action: 12,
          scale: 15,
        };
        totalScore += scoreMap[type] || 10;
      });
    });
  });
  
  return {
    achievements,
    count: achievements.length,
    score: Math.min(totalScore, 100), // Cap at 100
    hasQuantifiableImpact: achievements.length > 0,
  };
}

/**
 * Analyze section ordering (summary at top = better)
 * @param {object} resume - Parsed resume
 * @returns {object} Section ordering analysis
 */
function analyzeSectionOrdering(resume) {
  // Ideal order: Contact → Summary → Experience → Education → Skills → Projects
  const idealOrder = ['contact', 'summary', 'experience', 'education', 'skills', 'projects'];
  
  // Detect actual order from resume (would need section position metadata)
  // For now, check if summary exists
  const hasSummary = resume.parsedData?.summary || resume.rawText?.match(/summary|objective/i);
  
  return {
    hasSummary: !!hasSummary,
    orderScore: hasSummary ? 100 : 70, // Penalty for missing summary
  };
}

/**
 * Calculate comprehensive ATS score with role-specific weights
 * @param {object} resume - Parsed resume
 * @param {string} jdText - Job description text
 * @returns {object} Detailed ATS scoring
 */
export function calculateDynamicATSScore(resume, jdText = '') {
  // Detect role category
  const roleCategory = detectRoleCategory(resume, jdText);
  const weights = getRoleWeights(roleCategory);
  
  // Component scores
  const scores = {
    skills: scoreSkills(resume),
    experience: scoreExperience(resume),
    education: scoreEducation(resume),
    projects: scoreProjects(resume),
    keywords: jdText ? scoreKeywordsWithContext(resume, jdText).score : 0,
  };
  
  // Achievement bonus (up to +10 points)
  const achievementData = scoreAchievements(resume);
  const achievementBonus = Math.min(achievementData.count * 2, 10);
  
  // Section ordering penalty
  const orderingData = analyzeSectionOrdering(resume);
  const orderingPenalty = orderingData.hasSummary ? 0 : 5;
  
  // Calculate weighted total
  const baseScore = 
    scores.skills * weights.skills +
    scores.experience * weights.experience +
    scores.education * weights.education +
    scores.projects * weights.projects +
    scores.keywords * weights.keywords;
  
  const totalScore = Math.max(0, Math.min(100, baseScore + achievementBonus - orderingPenalty));
  
  return {
    totalScore: Math.round(totalScore),
    roleCategory,
    roleDescription: roleWeights[roleCategory].description,
    componentScores: scores,
    weights,
    achievements: achievementData,
    bonuses: {
      achievement: achievementBonus,
      ordering: -orderingPenalty,
    },
    breakdown: {
      skillsContribution: Math.round(scores.skills * weights.skills),
      experienceContribution: Math.round(scores.experience * weights.experience),
      educationContribution: Math.round(scores.education * weights.education),
      projectsContribution: Math.round(scores.projects * weights.projects),
      keywordsContribution: Math.round(scores.keywords * weights.keywords),
    },
  };
}

// Helper scoring functions
function scoreSkills(resume) {
  const skills = resume.parsedData?.skills || {};
  const allSkills = [
    ...(skills.programming || []),
    ...(skills.frameworks || []),
    ...(skills.databases || []),
    ...(skills.tools || []),
    ...(skills.cloud || []),
    ...(skills.other || []),
  ];
  
  // More skills = better, but diminishing returns
  const skillCount = allSkills.length;
  return Math.min(skillCount * 4, 100); // 25 skills = 100 points
}

function scoreExperience(resume) {
  const experience = resume.parsedData?.experience || [];
  
  if (experience.length === 0) return 0;
  
  // Calculate total years
  let totalMonths = 0;
  experience.forEach(exp => {
    if (exp.duration) {
      const yearsMatch = exp.duration.match(/(\d+)\s*year/i);
      const monthsMatch = exp.duration.match(/(\d+)\s*month/i);
      
      if (yearsMatch) totalMonths += parseInt(yearsMatch[1]) * 12;
      if (monthsMatch) totalMonths += parseInt(monthsMatch[1]);
    }
  });
  
  const years = totalMonths / 12;
  
  // Scoring: 0-2 years = 40-60, 2-5 years = 60-85, 5+ years = 85-100
  if (years < 2) return 40 + (years / 2) * 20;
  if (years < 5) return 60 + ((years - 2) / 3) * 25;
  return Math.min(85 + (years - 5) * 3, 100);
}

function scoreEducation(resume) {
  const education = resume.parsedData?.education || [];
  
  if (education.length === 0) return 0;
  
  // Check for degrees
  const hasBachelor = education.some(ed => /bachelor|b\.s|b\.e|b\.tech/i.test(ed.degree || ''));
  const hasMaster = education.some(ed => /master|m\.s|m\.e|m\.tech/i.test(ed.degree || ''));
  const hasPhD = education.some(ed => /phd|ph\.d|doctorate/i.test(ed.degree || ''));
  
  if (hasPhD) return 100;
  if (hasMaster) return 90;
  if (hasBachelor) return 75;
  return 50; // Some education but no clear degree
}

function scoreProjects(resume) {
  const projects = resume.parsedData?.projects || [];
  
  if (projects.length === 0) return 30; // Penalty for no projects
  
  // More projects = better
  return Math.min(30 + projects.length * 15, 100);
}

export default {
  detectRoleCategory,
  getRoleWeights,
  scoreKeywordsWithContext,
  scoreAchievements,
  calculateDynamicATSScore,
};
