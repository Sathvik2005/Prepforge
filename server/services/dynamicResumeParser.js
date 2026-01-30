/**
 * DYNAMIC RESUME PARSER - Works for ANY Domain/Role
 * 
 * ZERO HARD-CODING PHILOSOPHY:
 * - No predefined skill lists
 * - Universal pattern recognition
 * - Domain-agnostic extraction
 * - Logic-based, not template-based
 */

import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import ParsedResume from '../models/ParsedResume.js';

class DynamicResumeParser {
  
  /**
   * Parse resume file - works for ANY profession
   */
  async parseResume(userId, fileBuffer, filename, mimeType) {
    try {
      // 1. Extract raw text
      const rawText = await this.extractText(fileBuffer, mimeType);
      
      // 2. Detect ALL sections dynamically (no predefined list)
      const sections = this.detectSectionsDynamic(rawText);
      
      // 3. Extract entities using universal patterns
      const parsedData = {
        contact: this.extractContact(rawText),
        sections: sections,
        skills: this.extractSkillsDynamic(sections, rawText),
        experience: this.extractExperienceDynamic(sections),
        education: this.extractEducationDynamic(sections),
        projects: this.extractProjectsDynamic(sections),
        achievements: this.extractAchievementsDynamic(sections),
        certifications: this.extractCertificationsDynamic(sections),
        metadata: this.analyzeMetadata(rawText, sections)
      };
      
      // 4. Calculate ATS score using transparent rules
      const atsScore = this.calculateDynamicATSScore(parsedData);
      
      // 5. Save to database
      const resume = new ParsedResume({
        userId,
        originalFile: { filename, mimeType, uploadDate: new Date(), fileSize: fileBuffer.length },
        rawText,
        parsedData,
        atsScore,
        parsingMetadata: {
          sectionsFound: Object.keys(sections).length,
          parsingMethod: 'dynamic-pattern-recognition',
          confidence: this.calculateConfidence(parsedData),
          timestamp: new Date()
        }
      });
      
      await resume.save();
      return resume;
      
    } catch (error) {
      console.error('Dynamic parsing error:', error);
      throw new Error(`Resume parsing failed: ${error.message}`);
    }
  }
  
  /**
   * Extract text from any document format
   */
  async extractText(buffer, mimeType) {
    if (mimeType === 'application/pdf') {
      const data = await pdf(buffer);
      return data.text;
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    throw new Error('Unsupported format. Use PDF or DOCX.');
  }
  
  /**
   * Detect sections dynamically - works for ANY resume format
   */
  detectSectionsDynamic(text) {
    const lines = text.split('\n').map(l => l.trim());
    const sections = {};
    let currentSection = 'header';
    sections[currentSection] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      // Detect section header: ALL CAPS, short, ends with colon, or bold pattern
      const isHeader = this.isSectionHeader(line, lines[i + 1]);
      
      if (isHeader) {
        currentSection = line.toLowerCase().replace(/[:\s]+$/, '').trim();
        sections[currentSection] = [];
      } else {
        sections[currentSection].push(line);
      }
    }
    
    return sections;
  }
  
  /**
   * Identify if a line is a section header (universal logic)
   */
  isSectionHeader(line, nextLine) {
    if (line.length > 50) return false;  // Too long to be header
    if (line.length < 3) return false;   // Too short
    
    // Pattern 1: ALL UPPERCASE
    if (line === line.toUpperCase() && /[A-Z]/.test(line)) return true;
    
    // Pattern 2: Ends with colon
    if (line.endsWith(':')) return true;
    
    // Pattern 3: Followed by blank line or bullet points
    if (nextLine && (nextLine === '' || nextLine.startsWith('•') || nextLine.startsWith('-'))) {
      return /^[A-Z][a-zA-Z\s]+$/.test(line);
    }
    
    // Pattern 4: Common section words (minimal, expandable)
    const sectionKeywords = ['experience', 'education', 'skills', 'projects', 'summary', 
                             'certifications', 'achievements', 'publications', 'languages',
                             'awards', 'volunteer', 'activities', 'interests'];
    const lowerLine = line.toLowerCase();
    if (sectionKeywords.some(kw => lowerLine.includes(kw)) && line.split(' ').length <= 4) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Extract contact info using universal patterns
   */
  extractContact(text) {
    return {
      email: text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] || '',
      phone: text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] || '',
      linkedin: text.match(/(linkedin\.com\/in\/[\w-]+)/)?.[0] || '',
      github: text.match(/(github\.com\/[\w-]+)/)?.[0] || '',
      website: text.match(/(https?:\/\/[\w.-]+\.[\w.-]+)/)?.[0] || '',
      name: text.split('\n')[0]?.trim() || ''
    };
  }
  
  /**
   * Extract skills dynamically - NO predefined lists
   * Uses linguistic patterns to identify skills for ANY domain
   */
  extractSkillsDynamic(sections, fullText) {
    const skillSections = this.findSkillSections(sections);
    const allSkills = [];
    
    for (const section of skillSections) {
      const text = section.join(' ');
      
      // Pattern 1: Comma-separated lists
      const commaSeparated = text.split(/[,;•\-\n]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 50);
      allSkills.push(...commaSeparated);
      
      // Pattern 2: Detect noun phrases (technical terms)
      const nounPhrases = this.extractNounPhrases(text);
      allSkills.push(...nounPhrases);
    }
    
    // Categorize dynamically based on context
    return this.categorizeSkillsDynamic(allSkills, fullText);
  }
  
  /**
   * Find skill-related sections (any name)
   */
  findSkillSections(sections) {
    const skillKeywords = ['skill', 'competenc', 'expertise', 'proficien', 'technical', 'tools', 'technologies'];
    const skillSections = [];
    
    for (const [name, content] of Object.entries(sections)) {
      if (skillKeywords.some(kw => name.includes(kw))) {
        skillSections.push(content);
      }
    }
    
    return skillSections;
  }
  
  /**
   * Extract noun phrases (technical terms, tools, technologies)
   */
  extractNounPhrases(text) {
    const phrases = [];
    
    // Match capitalized words/phrases (likely proper nouns = technologies)
    const capitalizedPattern = /\b[A-Z][a-zA-Z0-9]*(?:\.[A-Z][a-zA-Z0-9]*)*\b/g;
    const matches = text.match(capitalizedPattern) || [];
    
    // Filter out common words
    const commonWords = ['The', 'A', 'An', 'I', 'In', 'At', 'On', 'For', 'To', 'Of', 'And', 'Or'];
    return matches.filter(m => !commonWords.includes(m) && m.length > 1);
  }
  
  /**
   * Categorize skills dynamically using context clues
   */
  categorizeSkillsDynamic(skills, fullText) {
    const categories = {
      technical: [],
      tools: [],
      soft: [],
      domain: [],
      uncategorized: []
    };
    
    const lowerText = fullText.toLowerCase();
    
    skills.forEach(skill => {
      const lowerSkill = skill.toLowerCase();
      
      // Context-based categorization
      if (/\.(js|py|java|cpp|ts|go|rb)$/.test(lowerSkill) || 
          lowerText.includes(`${lowerSkill} programming`) ||
          lowerText.includes(`${lowerSkill} development`)) {
        categories.technical.push(skill);
      }
      else if (lowerText.includes(`${lowerSkill} tool`) ||
               lowerText.includes(`using ${lowerSkill}`)) {
        categories.tools.push(skill);
      }
      else if (['leadership', 'communication', 'teamwork', 'management'].some(soft => lowerSkill.includes(soft))) {
        categories.soft.push(skill);
      }
      else {
        categories.domain.push(skill);
      }
    });
    
    return categories;
  }
  
  /**
   * Extract experience dynamically
   */
  extractExperienceDynamic(sections) {
    const expSections = this.findExperienceSections(sections);
    const experiences = [];
    
    for (const content of expSections) {
      const entries = this.parseExperienceEntries(content);
      experiences.push(...entries);
    }
    
    return experiences;
  }
  
  findExperienceSections(sections) {
    const keywords = ['experience', 'work', 'employment', 'career', 'history', 'professional'];
    const expSections = [];
    
    for (const [name, content] of Object.entries(sections)) {
      if (keywords.some(kw => name.includes(kw))) {
        expSections.push(content);
      }
    }
    
    return expSections;
  }
  
  parseExperienceEntries(lines) {
    const entries = [];
    let current = null;
    
    for (const line of lines) {
      // Detect job title/company line (has dates or separator)
      if (this.looksLikeJobHeader(line)) {
        if (current) entries.push(current);
        current = this.parseJobHeader(line);
      }
      else if (current && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))) {
        // Responsibility bullet
        current.responsibilities.push(line.replace(/^[•\-*]\s*/, ''));
      }
      else if (current && line.length > 20) {
        // Description line
        current.description = (current.description || '') + ' ' + line;
      }
    }
    
    if (current) entries.push(current);
    return entries;
  }
  
  looksLikeJobHeader(line) {
    // Has date pattern
    if (/\b(19|20)\d{2}\b/.test(line)) return true;
    // Has present/current
    if (/present|current/i.test(line)) return true;
    // Has separator (|, @, at, -)
    if (/\s+[@|]\s+|\s+at\s+/i.test(line)) return true;
    return false;
  }
  
  parseJobHeader(line) {
    const dates = line.match(/\b(19|20)\d{2}\b/g) || [];
    const hasPresentCurrent = /present|current/i.test(line);
    
    // Split by common separators
    const parts = line.split(/\s+[@|–—-]\s+|\s+at\s+/i);
    
    return {
      title: parts[0]?.trim() || '',
      company: parts[1]?.trim() || '',
      startDate: dates[0] || '',
      endDate: dates[1] || (hasPresentCurrent ? 'Present' : ''),
      isCurrent: hasPresentCurrent,
      responsibilities: [],
      description: ''
    };
  }
  
  /**
   * Extract education dynamically
   */
  extractEducationDynamic(sections) {
    const eduSections = this.findEducationSections(sections);
    const education = [];
    
    for (const content of eduSections) {
      const entries = this.parseEducationEntries(content);
      education.push(...entries);
    }
    
    return education;
  }
  
  findEducationSections(sections) {
    const keywords = ['education', 'academic', 'qualification', 'degree', 'school'];
    const eduSections = [];
    
    for (const [name, content] of Object.entries(sections)) {
      if (keywords.some(kw => name.includes(kw))) {
        eduSections.push(content);
      }
    }
    
    return eduSections;
  }
  
  parseEducationEntries(lines) {
    const entries = [];
    let current = null;
    
    for (const line of lines) {
      const years = line.match(/\b(19|20)\d{2}\b/g);
      
      if (years || this.looksLikeDegree(line)) {
        if (current) entries.push(current);
        current = {
          degree: line.trim(),
          institution: '',
          year: years?.[years.length - 1] || '',
          gpa: line.match(/GPA:?\s*([\d.]+)/i)?.[1] || ''
        };
      } else if (current && line.length > 5) {
        current.institution = line.trim();
      }
    }
    
    if (current) entries.push(current);
    return entries;
  }
  
  looksLikeDegree(line) {
    const degreeKeywords = ['bachelor', 'master', 'phd', 'diploma', 'certificate', 'b.s', 'm.s', 'b.tech', 'm.tech', 'mba'];
    const lower = line.toLowerCase();
    return degreeKeywords.some(kw => lower.includes(kw));
  }
  
  /**
   * Extract projects dynamically
   */
  extractProjectsDynamic(sections) {
    const projectSections = this.findProjectSections(sections);
    const projects = [];
    
    for (const content of projectSections) {
      const entries = this.parseProjectEntries(content);
      projects.push(...entries);
    }
    
    return projects;
  }
  
  findProjectSections(sections) {
    const keywords = ['project', 'portfolio', 'work'];
    const projectSections = [];
    
    for (const [name, content] of Object.entries(sections)) {
      if (keywords.some(kw => name.includes(kw))) {
        projectSections.push(content);
      }
    }
    
    return projectSections;
  }
  
  parseProjectEntries(lines) {
    const projects = [];
    let current = null;
    
    for (const line of lines) {
      if (line.length < 100 && !line.startsWith('•') && !line.startsWith('-')) {
        // Project title
        if (current) projects.push(current);
        current = {
          name: line.trim(),
          description: '',
          technologies: []
        };
      } else if (current) {
        current.description += ' ' + line.trim();
      }
    }
    
    if (current) projects.push(current);
    return projects;
  }
  
  /**
   * Extract achievements
   */
  extractAchievementsDynamic(sections) {
    const achievementSections = this.findAchievementSections(sections);
    const achievements = [];
    
    for (const content of achievementSections) {
      achievements.push(...content.filter(line => line.trim()));
    }
    
    return achievements;
  }
  
  findAchievementSections(sections) {
    const keywords = ['achievement', 'award', 'honor', 'recognition', 'accomplishment'];
    const achievementSections = [];
    
    for (const [name, content] of Object.entries(sections)) {
      if (keywords.some(kw => name.includes(kw))) {
        achievementSections.push(content);
      }
    }
    
    return achievementSections;
  }
  
  /**
   * Extract certifications
   */
  extractCertificationsDynamic(sections) {
    const certSections = this.findCertificationSections(sections);
    const certifications = [];
    
    for (const content of certSections) {
      for (const line of content) {
        if (line.trim()) {
          certifications.push({
            name: line.trim(),
            year: line.match(/\b(19|20)\d{2}\b/)?.[0] || ''
          });
        }
      }
    }
    
    return certifications;
  }
  
  findCertificationSections(sections) {
    const keywords = ['certification', 'certificate', 'license', 'credential'];
    const certSections = [];
    
    for (const [name, content] of Object.entries(sections)) {
      if (keywords.some(kw => name.includes(kw))) {
        certSections.push(content);
      }
    }
    
    return certSections;
  }
  
  /**
   * Analyze metadata
   */
  analyzeMetadata(rawText, sections) {
    return {
      totalSections: Object.keys(sections).length,
      wordCount: rawText.split(/\s+/).length,
      hasContactInfo: /[\w.+-]+@[\w-]+\.[\w.-]+/.test(rawText),
      estimatedPages: Math.ceil(rawText.length / 3000),
      language: 'en',  // Could add language detection
      format: 'text'
    };
  }
  
  /**
   * Calculate confidence score
   */
  calculateConfidence(parsedData) {
    let confidence = 0;
    
    if (parsedData.contact.email) confidence += 20;
    if (parsedData.contact.phone) confidence += 10;
    if (parsedData.experience.length > 0) confidence += 25;
    if (parsedData.education.length > 0) confidence += 20;
    if (Object.values(parsedData.skills).flat().length > 3) confidence += 25;
    
    return Math.min(confidence, 100);
  }
  
  /**
   * Calculate ATS score - dynamic, formula-based
   */
  calculateDynamicATSScore(parsedData) {
    const scores = {};
    
    // 1. Contact Completeness (10%)
    const contactFields = Object.values(parsedData.contact).filter(v => v).length;
    scores.contactScore = (contactFields / 6) * 100;
    
    // 2. Experience Score (30%)
    const expCount = parsedData.experience.length;
    const hasResponsibilities = parsedData.experience.some(e => e.responsibilities?.length > 0);
    scores.experienceScore = Math.min((expCount * 25) + (hasResponsibilities ? 25 : 0), 100);
    
    // 3. Education Score (20%)
    scores.educationScore = parsedData.education.length > 0 ? 100 : 0;
    
    // 4. Skills Score (25%)
    const totalSkills = Object.values(parsedData.skills).flat().length;
    scores.skillsScore = Math.min((totalSkills / 15) * 100, 100);
    
    // 5. Structure Score (15%)
    const hasKeySection = ['experience', 'education', 'skills'].every(key => 
      Object.keys(parsedData.sections).some(section => section.includes(key))
    );
    scores.structureScore = hasKeySection ? 100 : 50;
    
    // Weighted total
    const totalScore = 
      scores.contactScore * 0.10 +
      scores.experienceScore * 0.30 +
      scores.educationScore * 0.20 +
      scores.skillsScore * 0.25 +
      scores.structureScore * 0.15;
    
    return {
      totalScore: Math.round(totalScore),
      componentScores: {
        contact: Math.round(scores.contactScore),
        experience: Math.round(scores.experienceScore),
        education: Math.round(scores.educationScore),
        skills: Math.round(scores.skillsScore),
        structure: Math.round(scores.structureScore)
      },
      explanation: this.generateScoreExplanation(scores, parsedData)
    };
  }
  
  /**
   * Generate score explanation
   */
  generateScoreExplanation(scores, parsedData) {
    const strengths = [];
    const improvements = [];
    
    if (scores.skillsScore >= 75) strengths.push(`Strong skills section with ${Object.values(parsedData.skills).flat().length} skills identified`);
    else improvements.push('Add more relevant skills and technologies');
    
    if (scores.experienceScore >= 75) strengths.push(`${parsedData.experience.length} work experiences listed`);
    else improvements.push('Include more detailed work experience with responsibilities');
    
    if (scores.educationScore === 100) strengths.push('Education section present');
    else improvements.push('Add education details');
    
    if (scores.contactScore >= 80) strengths.push('Complete contact information');
    else improvements.push('Ensure all contact details are included');
    
    return { strengths, improvements };
  }
}

export default new DynamicResumeParser();
