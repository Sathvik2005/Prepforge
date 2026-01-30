import ParsedResume from '../models/ParsedResume.js';

/**
 * Job Description Matcher Service
 * Matches resumes against job descriptions to identify skill gaps
 * 
 * METHODOLOGY (100% Rule-Based):
 * 1. Parse JD for required/preferred skills
 * 2. Compare against resume skills
 * 3. Calculate match percentage (matched / required)
 * 4. Classify gaps by severity (critical vs nice-to-have)
 * 5. Generate improvement recommendations
 */

class JDMatcherService {
  /**
   * Match resume against job description
   */
  async matchResumeToJD(resumeId, jobDescriptionText) {
    try {
      const resume = await ParsedResume.findById(resumeId);
      if (!resume) throw new Error('Resume not found');
      
      // Parse JD
      const parsedJD = this.parseJobDescription(jobDescriptionText);
      
      // Get resume skills
      const resumeSkills = resume.getAllSkills().map(s => s.toLowerCase());
      
      // Calculate match
      const matchResult = this.calculateMatch(resumeSkills, parsedJD);
      
      // Identify gaps
      const skillGaps = this.identifySkillGaps(resumeSkills, parsedJD);
      
      return {
        matchPercentage: matchResult.matchPercentage,
        matchedSkills: matchResult.matchedSkills,
        missingRequired: skillGaps.required,
        missingPreferred: skillGaps.preferred,
        strengths: matchResult.strengths,
        recommendations: this.generateRecommendations(skillGaps),
        parsedJD,
      };
      
    } catch (error) {
      console.error('JD matching error:', error);
      throw new Error('Failed to match resume: ' + error.message);
    }
  }
  
  /**
   * Parse job description for skills (rule-based)
   */
  parseJobDescription(text) {
    const lowerText = text.toLowerCase();
    
    // Extract required skills
    const requiredSection = this.extractSection(text, ['required', 'must have', 'qualifications']);
    const preferredSection = this.extractSection(text, ['preferred', 'nice to have', 'bonus']);
    
    // Skill dictionary (same as resume parser)
    const allSkills = [
      // Programming
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust',
      'ruby', 'php', 'swift', 'kotlin', 'scala', 'r',
      // Frameworks
      'react', 'angular', 'vue', 'next.js', 'node.js', 'express', 'django',
      'flask', 'fastapi', 'spring', 'spring boot', '.net', 'asp.net',
      'tensorflow', 'pytorch', 'keras',
      // Databases
      'mongodb', 'mysql', 'postgresql', 'redis', 'cassandra', 'dynamodb',
      'firebase', 'sql server', 'oracle', 'elasticsearch',
      // Cloud
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins',
      'ci/cd', 'terraform', 'ansible',
      // Tools
      'git', 'jira', 'agile', 'scrum', 'rest api', 'graphql',
    ];
    
    const required = [];
    const preferred = [];
    
    allSkills.forEach(skill => {
      const regex = new RegExp(`\\b${skill}\\b`, 'i');
      
      if (requiredSection && regex.test(requiredSection)) {
        required.push(skill);
      } else if (preferredSection && regex.test(preferredSection)) {
        preferred.push(skill);
      } else if (regex.test(text)) {
        // Found in general text (assume required)
        required.push(skill);
      }
    });
    
    // Extract experience requirements
    const experienceMatch = text.match(/(\d+)\+?\s*years?\s*(?:of\s*)?experience/i);
    const minYears = experienceMatch ? parseInt(experienceMatch[1]) : null;
    
    // Extract education requirements
    const hasBachelorReq = /bachelor|b\.s\.|b\.tech/i.test(text);
    const hasMasterReq = /master|m\.s\.|m\.tech|mba/i.test(text);
    
    return {
      requiredSkills: [...new Set(required)],
      preferredSkills: [...new Set(preferred)],
      minExperienceYears: minYears,
      educationRequired: hasBachelorReq ? (hasMasterReq ? 'masters' : 'bachelors') : null,
      rawText: text,
    };
  }
  
  /**
   * Calculate match percentage (transparent formula)
   */
  calculateMatch(resumeSkills, parsedJD) {
    const { requiredSkills, preferredSkills } = parsedJD;
    
    // Match required
    const matchedRequired = requiredSkills.filter(skill => 
      resumeSkills.some(rs => rs.includes(skill) || skill.includes(rs))
    );
    
    // Match preferred
    const matchedPreferred = preferredSkills.filter(skill =>
      resumeSkills.some(rs => rs.includes(skill) || skill.includes(rs))
    );
    
    // Calculate percentage
    // Formula: (matchedRequired + 0.5 * matchedPreferred) / (required + 0.5 * preferred)
    const requiredWeight = 1.0;
    const preferredWeight = 0.5;
    
    const totalPossible = requiredSkills.length * requiredWeight + preferredSkills.length * preferredWeight;
    const totalMatched = matchedRequired.length * requiredWeight + matchedPreferred.length * preferredWeight;
    
    const matchPercentage = totalPossible > 0 ? (totalMatched / totalPossible) * 100 : 0;
    
    // Identify strengths
    const strengths = [];
    if (matchedRequired.length >= requiredSkills.length * 0.8) {
      strengths.push('Strong alignment with required skills');
    }
    if (matchedPreferred.length >= preferredSkills.length * 0.5) {
      strengths.push('Good coverage of preferred skills');
    }
    
    return {
      matchPercentage: Math.round(matchPercentage),
      matchedSkills: [...matchedRequired, ...matchedPreferred],
      requiredMatch: requiredSkills.length > 0 ? (matchedRequired.length / requiredSkills.length) * 100 : 0,
      preferredMatch: preferredSkills.length > 0 ? (matchedPreferred.length / preferredSkills.length) * 100 : 0,
      strengths,
    };
  }
  
  /**
   * Identify skill gaps
   */
  identifySkillGaps(resumeSkills, parsedJD) {
    const { requiredSkills, preferredSkills } = parsedJD;
    
    const missingRequired = requiredSkills.filter(skill =>
      !resumeSkills.some(rs => rs.includes(skill) || skill.includes(rs))
    );
    
    const missingPreferred = preferredSkills.filter(skill =>
      !resumeSkills.some(rs => rs.includes(skill) || skill.includes(rs))
    );
    
    return {
      required: missingRequired,
      preferred: missingPreferred,
    };
  }
  
  /**
   * Generate recommendations
   */
  generateRecommendations(skillGaps) {
    const recommendations = [];
    
    if (skillGaps.required.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'skills',
        message: `Focus on learning these required skills: ${skillGaps.required.slice(0, 3).join(', ')}`,
        skills: skillGaps.required,
      });
    }
    
    if (skillGaps.preferred.length > 0 && skillGaps.required.length === 0) {
      recommendations.push({
        priority: 'medium',
        category: 'skills',
        message: `Consider learning these preferred skills to strengthen your profile: ${skillGaps.preferred.slice(0, 3).join(', ')}`,
        skills: skillGaps.preferred,
      });
    }
    
    return recommendations;
  }
  
  /**
   * Extract section from text
   */
  extractSection(text, keywords) {
    const lines = text.split('\n');
    let sectionStart = -1;
    let sectionEnd = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const lowerLine = lines[i].toLowerCase();
      
      if (sectionStart === -1 && keywords.some(kw => lowerLine.includes(kw))) {
        sectionStart = i;
      } else if (sectionStart !== -1 && lowerLine.match(/^[A-Z]/)) {
        sectionEnd = i;
        break;
      }
    }
    
    if (sectionStart !== -1) {
      return lines.slice(sectionStart, sectionEnd !== -1 ? sectionEnd : lines.length).join('\n');
    }
    
    return null;
  }
}

export default new JDMatcherService();
