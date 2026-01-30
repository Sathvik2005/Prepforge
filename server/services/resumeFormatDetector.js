/**
 * Resume Format Detector Service
 * Detects resume format (Western, Europass, Indian, etc.) and provides format-specific parsing strategies
 * 
 * SDP Justification:
 * - Uses rule-based heuristics (NOT AI) for transparent, reproducible format detection
 * - Multi-language support for global accessibility
 * - Confidence scoring for partial/uncertain detections
 */

/**
 * Detect resume format from raw text and metadata
 * @param {Buffer} fileBuffer - Original file buffer
 * @param {string} rawText - Extracted text content
 * @returns {object} Format detection result
 */
export function detectResumeFormat(fileBuffer, rawText) {
  const indicators = {
    hasPhoto: false,
    hasSummary: false,
    sectionOrder: [],
    language: 'english',
  };
  
  const formatScores = {
    'western-standard': 0,
    'europass': 0,
    'indian-standard': 0,
    'resume-builder': 0,
  };
  
  // 1. Photo detection (Europass/Indian often have photos)
  // PDFs with embedded images have specific byte patterns
  const hasImagePattern = fileBuffer.toString('binary').includes('/Image') || 
                          fileBuffer.toString('binary').includes('JFIF') ||
                          fileBuffer.toString('binary').includes('PNG');
  
  if (hasImagePattern) {
    indicators.hasPhoto = true;
    formatScores['europass'] += 25;
    formatScores['indian-standard'] += 25;
    formatScores['western-standard'] -= 10; // Western resumes rarely have photos
  }
  
  // 2. Language detection (multilingual headers)
  const languagePatterns = {
    english: /\b(experience|education|skills|summary|objective)\b/i,
    spanish: /\b(experiencia|educación|habilidades|resumen|objetivo)\b/i,
    french: /\b(expérience|éducation|compétences|résumé|objectif)\b/i,
    german: /\b(erfahrung|bildung|fähigkeiten|zusammenfassung|ziel)\b/i,
    hindi: /\b(अनुभव|शिक्षा|कौशल|सारांश)\b/,
  };
  
  for (const [lang, pattern] of Object.entries(languagePatterns)) {
    if (pattern.test(rawText)) {
      indicators.language = lang;
      if (lang === 'hindi' || lang === 'spanish') {
        formatScores['indian-standard'] += 15;
      }
      break;
    }
  }
  
  // 3. Section order and naming patterns
  const sectionPatterns = [
    { name: 'summary', pattern: /\b(professional\s+summary|career\s+objective|about\s+me|profile)\b/i },
    { name: 'experience', pattern: /\b(work\s+experience|employment\s+history|professional\s+experience)\b/i },
    { name: 'education', pattern: /\b(education|academic\s+background|qualifications)\b/i },
    { name: 'skills', pattern: /\b(skills|technical\s+skills|core\s+competencies)\b/i },
    { name: 'projects', pattern: /\b(projects|portfolio|key\s+achievements)\b/i },
    { name: 'certifications', pattern: /\b(certifications|licenses|training)\b/i },
    { name: 'declaration', pattern: /\b(declaration|i\s+hereby\s+declare)\b/i }, // Common in Indian resumes
  ];
  
  sectionPatterns.forEach(({ name, pattern }) => {
    const match = rawText.match(pattern);
    if (match) {
      indicators.sectionOrder.push(name);
      
      // Declaration section is strong indicator of Indian format
      if (name === 'declaration') {
        formatScores['indian-standard'] += 30;
      }
      
      // Summary at top = Western standard
      if (name === 'summary' && rawText.indexOf(match[0]) < rawText.length * 0.2) {
        formatScores['western-standard'] += 20;
        indicators.hasSummary = true;
      }
    }
  });
  
  // 4. Europass-specific markers
  const europassMarkers = [
    /curriculum\s+vitae/i,
    /personal\s+information/i,
    /date\s+of\s+birth/i,
    /nationality/i,
  ];
  
  const europassMatches = europassMarkers.filter(pattern => pattern.test(rawText)).length;
  formatScores['europass'] += europassMatches * 20;
  
  // 5. Resume builder detection (strict formatting)
  const hasStrictFormatting = rawText.match(/\n{3,}/g); // Multiple blank lines = template
  const hasConsistentBullets = (rawText.match(/^[\s]*[•●\-\*]/gm) || []).length > 5;
  
  if (hasStrictFormatting && hasConsistentBullets) {
    formatScores['resume-builder'] += 20;
  }
  
  // 6. Indian resume patterns
  const indianMarkers = [
    /father['']?s\s+name/i,
    /date\s+of\s+birth/i,
    /marital\s+status/i,
    /permanent\s+address/i,
    /languages?\s+known/i,
  ];
  
  const indianMatches = indianMarkers.filter(pattern => pattern.test(rawText)).length;
  formatScores['indian-standard'] += indianMatches * 15;
  
  // Determine winning format
  let detectedFormat = 'unknown';
  let maxScore = 30; // Minimum confidence threshold
  
  for (const [format, score] of Object.entries(formatScores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedFormat = format;
    }
  }
  
  return {
    type: detectedFormat,
    confidence: Math.min(maxScore, 100),
    formatIndicators: indicators,
    scores: formatScores, // For debugging
  };
}

/**
 * Extract resume data using format-specific strategy
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} rawText - Extracted text
 * @param {string} format - Detected format
 * @returns {object} Extracted data with quality scores
 */
export async function extractWithStrategy(fileBuffer, rawText, format) {
  switch (format) {
    case 'europass':
      return extractEuropassFormat(rawText);
    case 'indian-standard':
      return extractIndianFormat(rawText);
    case 'resume-builder':
      return extractTemplateFormat(rawText);
    case 'western-standard':
    default:
      return extractWesternFormat(rawText);
  }
}

/**
 * Extract data from Western-style resumes
 */
function extractWesternFormat(rawText) {
  const extractionQuality = {
    overall: 0,
    sectionScores: {},
    failedSections: [],
    warnings: [],
  };
  
  // Contact extraction
  const contactData = extractContactInfo(rawText);
  extractionQuality.sectionScores.contact = scoreContactExtraction(contactData);
  
  // Education extraction
  const educationData = extractEducation(rawText);
  extractionQuality.sectionScores.education = educationData.length > 0 ? 90 : 30;
  if (educationData.length === 0) {
    extractionQuality.failedSections.push('education');
    extractionQuality.warnings.push('No education section found - resume may be incomplete');
  }
  
  // Experience extraction
  const experienceData = extractExperience(rawText);
  extractionQuality.sectionScores.experience = experienceData.length > 0 ? 85 : 20;
  if (experienceData.length === 0) {
    extractionQuality.warnings.push('No work experience found');
  }
  
  // Skills extraction
  const skillsData = extractSkills(rawText);
  const totalSkills = Object.values(skillsData).flat().length;
  extractionQuality.sectionScores.skills = totalSkills > 5 ? 90 : (totalSkills * 15);
  
  // Calculate overall quality
  const scores = Object.values(extractionQuality.sectionScores);
  extractionQuality.overall = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  return {
    parsedData: {
      contact: contactData,
      education: educationData,
      experience: experienceData,
      skills: skillsData,
    },
    extractionQuality,
  };
}

/**
 * Extract data from Europass format
 */
function extractEuropassFormat(rawText) {
  // Europass has strict section headers
  const sections = {
    'Personal information': /Personal\s+information([\s\S]*?)(?=Work\s+experience|Education|$)/i,
    'Work experience': /Work\s+experience([\s\S]*?)(?=Education|Skills|$)/i,
    'Education': /Education\s+and\s+training([\s\S]*?)(?=Skills|Languages|$)/i,
    'Skills': /Skills([\s\S]*?)(?=Languages|Additional|$)/i,
  };
  
  const extractionQuality = {
    overall: 0,
    sectionScores: {},
    failedSections: [],
    warnings: [],
  };
  
  // Extract each section
  const contactMatch = sections['Personal information'].exec(rawText);
  const contactData = contactMatch ? extractContactInfo(contactMatch[1]) : {};
  extractionQuality.sectionScores.contact = scoreContactExtraction(contactData);
  
  const expMatch = sections['Work experience'].exec(rawText);
  const experienceData = expMatch ? extractExperience(expMatch[1]) : [];
  extractionQuality.sectionScores.experience = experienceData.length > 0 ? 95 : 40;
  
  const eduMatch = sections['Education'].exec(rawText);
  const educationData = eduMatch ? extractEducation(eduMatch[1]) : [];
  extractionQuality.sectionScores.education = educationData.length > 0 ? 95 : 40;
  
  const skillsMatch = sections['Skills'].exec(rawText);
  const skillsData = skillsMatch ? extractSkills(skillsMatch[1]) : {};
  const totalSkills = Object.values(skillsData).flat().length;
  extractionQuality.sectionScores.skills = totalSkills > 5 ? 95 : 50;
  
  const scores = Object.values(extractionQuality.sectionScores);
  extractionQuality.overall = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  if (extractionQuality.overall < 60) {
    extractionQuality.warnings.push('Europass format detected but extraction quality is low');
  }
  
  return {
    parsedData: {
      contact: contactData,
      education: educationData,
      experience: experienceData,
      skills: skillsData,
    },
    extractionQuality,
  };
}

/**
 * Extract data from Indian-style resumes
 */
function extractIndianFormat(rawText) {
  const extractionQuality = {
    overall: 0,
    sectionScores: {},
    failedSections: [],
    warnings: ['Indian format detected - declaration section may affect parsing'],
  };
  
  // Indian resumes often have declaration at the end - remove it
  const declarationPattern = /declaration[\s\S]*?(?=signature|$)/i;
  const cleanedText = rawText.replace(declarationPattern, '');
  
  // Extract sections (similar to Western but with additional fields)
  const contactData = extractContactInfo(cleanedText);
  
  // Indian resumes often have father's name - extract separately
  const fatherNameMatch = cleanedText.match(/father['']?s\s+name\s*:?\s*([^\n]+)/i);
  if (fatherNameMatch) {
    contactData.metadata = { fathersName: fatherNameMatch[1].trim() };
  }
  
  extractionQuality.sectionScores.contact = scoreContactExtraction(contactData);
  
  const educationData = extractEducation(cleanedText);
  extractionQuality.sectionScores.education = educationData.length > 0 ? 90 : 35;
  
  const experienceData = extractExperience(cleanedText);
  extractionQuality.sectionScores.experience = experienceData.length > 0 ? 85 : 25;
  
  const skillsData = extractSkills(cleanedText);
  const totalSkills = Object.values(skillsData).flat().length;
  extractionQuality.sectionScores.skills = totalSkills > 5 ? 90 : 40;
  
  const scores = Object.values(extractionQuality.sectionScores);
  extractionQuality.overall = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  return {
    parsedData: {
      contact: contactData,
      education: educationData,
      experience: experienceData,
      skills: skillsData,
    },
    extractionQuality,
  };
}

/**
 * Extract data from template/builder resumes
 */
function extractTemplateFormat(rawText) {
  // Template resumes have consistent bullet points and spacing
  return extractWesternFormat(rawText); // Use Western strategy with higher confidence
}

/**
 * Score contact information extraction quality
 */
function scoreContactExtraction(contactData) {
  let score = 0;
  const fields = ['name', 'email', 'phone', 'location'];
  
  fields.forEach(field => {
    if (contactData[field] && contactData[field].length > 0) {
      score += 25;
    }
  });
  
  return score;
}

// Helper extraction functions (import from existing resumeParserService.js)
function extractContactInfo(text) {
  const contact = {};
  
  // Email
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) contact.email = emailMatch[0];
  
  // Phone (multiple formats)
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) contact.phone = phoneMatch[0];
  
  // Name (first line before email)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    contact.name = lines[0];
  }
  
  // LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/([^\s\n]+)/i);
  if (linkedinMatch) contact.linkedin = `https://linkedin.com/in/${linkedinMatch[1]}`;
  
  // GitHub
  const githubMatch = text.match(/github\.com\/([^\s\n]+)/i);
  if (githubMatch) contact.github = `https://github.com/${githubMatch[1]}`;
  
  return contact;
}

function extractEducation(text) {
  // Simplified - delegate to existing parser
  return [];
}

function extractExperience(text) {
  // Simplified - delegate to existing parser
  return [];
}

function extractSkills(text) {
  // Simplified - delegate to existing parser
  return {
    programming: [],
    frameworks: [],
    databases: [],
    tools: [],
    cloud: [],
    softSkills: [],
    other: [],
  };
}

export default {
  detectResumeFormat,
  extractWithStrategy,
};
