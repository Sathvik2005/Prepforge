/**
 * Skill Ontology and Semantic Matching Service
 * Handles skill synonyms, hierarchies, and transferability analysis
 * 
 * SDP Justification:
 * - Rule-based skill taxonomy (NOT AI) for reproducible matching
 * - Transparent transferability scores with documented reasoning
 * - Extensible ontology for new technologies
 */

/**
 * Skill Ontology Database
 * Structure: synonyms, hierarchy, transferability matrix
 */
const skillOntology = {
  // Synonym mappings (canonical form → variations)
  synonyms: {
    // Frontend
    'react': ['react.js', 'reactjs', 'react js'],
    'angular': ['angular.js', 'angularjs', 'angular 2+'],
    'vue': ['vue.js', 'vuejs', 'vue js'],
    'next.js': ['nextjs', 'next'],
    'nuxt.js': ['nuxtjs', 'nuxt'],
    
    // Backend
    'node.js': ['nodejs', 'node', 'node js'],
    'express': ['express.js', 'expressjs'],
    'fastify': ['fastify.js'],
    'spring': ['spring framework', 'spring boot', 'springboot'],
    'django': ['django framework'],
    'flask': ['flask framework'],
    
    // Databases
    'mongodb': ['mongo', 'mongo db'],
    'postgresql': ['postgres', 'psql', 'postgre sql'],
    'mysql': ['my sql'],
    'redis': ['redis cache'],
    
    // Cloud
    'aws': ['amazon web services', 'amazon aws'],
    'azure': ['microsoft azure'],
    'gcp': ['google cloud', 'google cloud platform'],
    
    // DevOps
    'docker': ['containerization', 'docker container'],
    'kubernetes': ['k8s', 'kube'],
    'jenkins': ['jenkins ci', 'jenkins ci/cd'],
    'github actions': ['github action', 'gh actions'],
    
    // Languages
    'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
    'typescript': ['ts'],
    'python': ['python3', 'python 3'],
    'java': ['java se', 'java ee'],
    'c++': ['cpp', 'c plus plus'],
    'c#': ['csharp', 'c sharp'],
  },
  
  // Hierarchical taxonomy (category → subcategories)
  hierarchy: {
    'frontend-frameworks': {
      children: ['react', 'angular', 'vue', 'svelte', 'solid'],
      transferability: 0.7, // 70% skill overlap within category
    },
    'backend-frameworks': {
      children: ['express', 'fastify', 'koa', 'hapi', 'nest.js'],
      transferability: 0.6,
    },
    'java-backend': {
      children: ['spring', 'spring boot', 'hibernate', 'struts'],
      transferability: 0.75,
    },
    'python-backend': {
      children: ['django', 'flask', 'fastapi', 'tornado'],
      transferability: 0.65,
    },
    'sql-databases': {
      children: ['postgresql', 'mysql', 'mssql', 'oracle', 'sqlite'],
      transferability: 0.8,
    },
    'nosql-databases': {
      children: ['mongodb', 'cassandra', 'couchdb', 'dynamodb'],
      transferability: 0.5,
    },
    'cloud-platforms': {
      children: ['aws', 'azure', 'gcp', 'digital ocean', 'heroku'],
      transferability: 0.6,
    },
    'containerization': {
      children: ['docker', 'kubernetes', 'docker compose', 'containerd'],
      transferability: 0.75,
    },
    'ci-cd': {
      children: ['jenkins', 'github actions', 'gitlab ci', 'circle ci', 'travis ci'],
      transferability: 0.7,
    },
    'testing-frameworks': {
      children: ['jest', 'mocha', 'jasmine', 'pytest', 'junit'],
      transferability: 0.65,
    },
    'state-management': {
      children: ['redux', 'mobx', 'zustand', 'recoil', 'vuex', 'pinia'],
      transferability: 0.6,
    },
  },
  
  // Proficiency level keywords
  proficiencyKeywords: {
    expert: ['expert', 'advanced', 'senior', 'lead', 'architect', '5+ years', '7+ years'],
    advanced: ['proficient', 'strong', 'extensive', '3+ years', '4+ years'],
    intermediate: ['working knowledge', 'familiar', 'comfortable', '1-2 years', '2+ years'],
    beginner: ['basic', 'learning', 'exposure', 'coursework', '< 1 year'],
  },
};

/**
 * Normalize skill name to canonical form
 * @param {string} skillName - Raw skill name
 * @returns {string} Canonical skill name
 */
export function normalizeSkillName(skillName) {
  const normalized = skillName.toLowerCase().trim();
  
  // Check if it's a synonym
  for (const [canonical, synonyms] of Object.entries(skillOntology.synonyms)) {
    if (canonical === normalized || synonyms.includes(normalized)) {
      return canonical;
    }
  }
  
  return normalized;
}

/**
 * Extract proficiency level from context
 * @param {string} context - Text context around skill mention
 * @returns {string} Proficiency level
 */
export function extractProficiencyLevel(context) {
  const lowerContext = context.toLowerCase();
  
  // Check for explicit proficiency keywords
  for (const [level, keywords] of Object.entries(skillOntology.proficiencyKeywords)) {
    for (const keyword of keywords) {
      if (lowerContext.includes(keyword)) {
        return level;
      }
    }
  }
  
  // Year-based inference
  const yearsMatch = lowerContext.match(/(\d+)\s*\+?\s*years?/);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1]);
    if (years >= 5) return 'expert';
    if (years >= 3) return 'advanced';
    if (years >= 1) return 'intermediate';
    return 'beginner';
  }
  
  return 'intermediate'; // Default assumption
}

/**
 * Find category for a skill
 * @param {string} skill - Canonical skill name
 * @returns {string|null} Category name
 */
function findSkillCategory(skill) {
  for (const [category, data] of Object.entries(skillOntology.hierarchy)) {
    if (data.children.includes(skill)) {
      return category;
    }
  }
  return null;
}

/**
 * Calculate transferability score between two skills
 * @param {string} skill1 - First skill (canonical)
 * @param {string} skill2 - Second skill (canonical)
 * @returns {number} Transferability score (0-1)
 */
export function calculateTransferability(skill1, skill2) {
  // Exact match
  if (skill1 === skill2) {
    return 1.0;
  }
  
  // Check if synonyms (should already be normalized, but double-check)
  const synonyms1 = skillOntology.synonyms[skill1] || [];
  const synonyms2 = skillOntology.synonyms[skill2] || [];
  
  if (synonyms1.includes(skill2) || synonyms2.includes(skill1)) {
    return 1.0;
  }
  
  // Check if in same category
  const category1 = findSkillCategory(skill1);
  const category2 = findSkillCategory(skill2);
  
  if (category1 && category1 === category2) {
    const transferability = skillOntology.hierarchy[category1].transferability;
    return transferability;
  }
  
  // No relationship
  return 0.0;
}

/**
 * Match skills with semantic understanding
 * @param {Array} resumeSkills - Skills from resume
 * @param {Array} jdSkills - Skills from job description
 * @returns {object} Detailed matching results
 */
export function semanticSkillMatch(resumeSkills, jdSkills) {
  const results = {
    exactMatches: [],
    synonymMatches: [],
    transferableMatches: [],
    missingSkills: [],
    matchScore: 0,
    detailedMatches: [],
  };
  
  // Normalize all skills
  const normalizedResumeSkills = resumeSkills.map(s => ({
    original: s,
    canonical: normalizeSkillName(typeof s === 'string' ? s : s.name),
    proficiency: typeof s === 'object' ? s.proficiencyLevel : 'intermediate',
  }));
  
  const normalizedJDSkills = jdSkills.map(s => ({
    original: s,
    canonical: normalizeSkillName(typeof s === 'string' ? s : s.name),
    required: typeof s === 'object' ? s.required : true,
    minProficiency: typeof s === 'object' ? s.proficiency : 'intermediate',
  }));
  
  // Match each JD skill
  normalizedJDSkills.forEach(jdSkill => {
    let bestMatch = null;
    let bestScore = 0;
    let matchType = 'missing';
    
    normalizedResumeSkills.forEach(resumeSkill => {
      const transferability = calculateTransferability(resumeSkill.canonical, jdSkill.canonical);
      
      if (transferability > bestScore) {
        bestScore = transferability;
        bestMatch = resumeSkill;
        
        if (transferability === 1.0) {
          matchType = resumeSkill.canonical === jdSkill.canonical ? 'exact' : 'synonym';
        } else if (transferability >= 0.6) {
          matchType = 'transferable';
        }
      }
    });
    
    const matchDetail = {
      jdSkill: jdSkill.original,
      jdCanonical: jdSkill.canonical,
      required: jdSkill.required,
      minProficiency: jdSkill.minProficiency,
      matchType,
      matchScore: bestScore,
      resumeSkill: bestMatch ? bestMatch.original : null,
      resumeCanonical: bestMatch ? bestMatch.canonical : null,
      resumeProficiency: bestMatch ? bestMatch.proficiency : null,
      proficiencyMatch: bestMatch ? proficiencyMatches(bestMatch.proficiency, jdSkill.minProficiency) : false,
      category: findSkillCategory(jdSkill.canonical),
    };
    
    results.detailedMatches.push(matchDetail);
    
    // Categorize matches
    if (matchType === 'exact') {
      results.exactMatches.push(matchDetail);
    } else if (matchType === 'synonym') {
      results.synonymMatches.push(matchDetail);
    } else if (matchType === 'transferable') {
      results.transferableMatches.push(matchDetail);
    } else {
      results.missingSkills.push(matchDetail);
    }
  });
  
  // Calculate overall match score
  const totalJDSkills = normalizedJDSkills.length;
  const exactWeight = 1.0;
  const synonymWeight = 1.0;
  const transferableWeight = 0.7;
  
  const weightedScore = 
    (results.exactMatches.length * exactWeight) +
    (results.synonymMatches.length * synonymWeight) +
    (results.transferableMatches.length * transferableWeight);
  
  results.matchScore = totalJDSkills > 0 
    ? Math.round((weightedScore / totalJDSkills) * 100)
    : 0;
  
  return results;
}

/**
 * Check if proficiency level matches requirements
 * @param {string} candidateProficiency - Candidate's proficiency
 * @param {string} requiredProficiency - Required proficiency
 * @returns {boolean} Whether proficiency matches
 */
function proficiencyMatches(candidateProficiency, requiredProficiency) {
  const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const candidateLevel = levels.indexOf(candidateProficiency);
  const requiredLevel = levels.indexOf(requiredProficiency);
  
  return candidateLevel >= requiredLevel;
}

/**
 * Extract skills from job description with proficiency requirements
 * @param {string} jdText - Job description text
 * @returns {Array} Extracted skills with requirements
 */
export function parseJDWithProficiency(jdText) {
  const skills = [];
  const lowerText = jdText.toLowerCase();
  
  // Search for all known skills in the JD
  const allCanonicalSkills = [
    ...Object.keys(skillOntology.synonyms),
    ...Object.values(skillOntology.hierarchy).flatMap(h => h.children),
  ];
  
  const uniqueSkills = [...new Set(allCanonicalSkills)];
  
  uniqueSkills.forEach(skill => {
    // Check if skill appears in JD
    const skillPattern = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const match = jdText.match(skillPattern);
    
    if (match) {
      // Get context around skill mention
      const matchIndex = jdText.indexOf(match[0]);
      const contextStart = Math.max(0, matchIndex - 100);
      const contextEnd = Math.min(jdText.length, matchIndex + 100);
      const context = jdText.substring(contextStart, contextEnd);
      
      // Extract proficiency requirement
      const proficiency = extractProficiencyLevel(context);
      
      // Determine if required or preferred
      const isRequired = /required|must have|essential/i.test(context);
      
      skills.push({
        name: skill,
        proficiency,
        required: isRequired,
        context: context.trim(),
      });
    }
  });
  
  return skills;
}

/**
 * Suggest learning path for missing skills
 * @param {string} missingSkill - Skill to learn
 * @param {Array} existingSkills - Candidate's existing skills
 * @returns {object} Learning path suggestion
 */
export function suggestLearningPath(missingSkill, existingSkills) {
  const normalizedMissing = normalizeSkillName(missingSkill);
  const category = findSkillCategory(normalizedMissing);
  
  // Check if candidate has related skills in same category
  const relatedSkills = [];
  if (category) {
    const categorySkills = skillOntology.hierarchy[category].children;
    
    existingSkills.forEach(skill => {
      const normalizedSkill = normalizeSkillName(typeof skill === 'string' ? skill : skill.name);
      if (categorySkills.includes(normalizedSkill)) {
        relatedSkills.push(normalizedSkill);
      }
    });
  }
  
  return {
    missingSkill: normalizedMissing,
    category,
    difficulty: relatedSkills.length > 0 ? 'Easy' : 'Medium',
    estimatedTime: relatedSkills.length > 0 ? '2-4 weeks' : '6-12 weeks',
    relatedSkills,
    reason: relatedSkills.length > 0
      ? `You already know ${relatedSkills.join(', ')} which are ${Math.round(skillOntology.hierarchy[category].transferability * 100)}% transferable`
      : 'This is a new skill area for you',
    prerequisites: relatedSkills.length > 0 ? [] : ['Basic programming knowledge'],
  };
}

/**
 * Cluster skills by category for better visualization
 * @param {Array} skills - List of skills
 * @returns {object} Skills grouped by category
 */
export function clusterSkillsByCategory(skills) {
  const clustered = {};
  const uncategorized = [];
  
  skills.forEach(skill => {
    const canonical = normalizeSkillName(typeof skill === 'string' ? skill : skill.name);
    const category = findSkillCategory(canonical);
    
    if (category) {
      if (!clustered[category]) {
        clustered[category] = [];
      }
      clustered[category].push(skill);
    } else {
      uncategorized.push(skill);
    }
  });
  
  if (uncategorized.length > 0) {
    clustered['other'] = uncategorized;
  }
  
  return clustered;
}

export default {
  normalizeSkillName,
  extractProficiencyLevel,
  calculateTransferability,
  semanticSkillMatch,
  parseJDWithProficiency,
  suggestLearningPath,
  clusterSkillsByCategory,
  skillOntology, // Export for testing/extension
};
