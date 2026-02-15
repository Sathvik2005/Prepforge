/**
 * Feature Degradation Service
 * Provides rule-based fallbacks when AI services are unavailable
 * 
 * Each feature has a graceful degradation path:
 * - Resume Analysis: Template-based analysis with heuristics
 * - Rephrase: Template-based bullet point generation
 * - Cover Letter: Structured template generator
 * - Interview Questions: Pre-built question library
 */

// ============= RESUME ANALYSIS FALLBACK =============

export function analyzeResumeRuleBased(parsedText, jobDescription = '') {
  const sections = extractSections(parsedText);
  const skills = extractSkills(parsedText);
  const experience = extractExperience(parsedText);
  const education = extractEducation(parsedText);
  const keywords = extractKeywords(jobDescription);
  
  let analysis = `# Resume Analysis (Rule-Based Mode)\n\n`;
  analysis += `⚠️ *Note: AI-powered analysis is temporarily unavailable. This is a rule-based analysis.*\n\n`;
  
  // Overview
  analysis += `## Overview\n\n`;
  analysis += `This resume contains ${sections.length} main sections with ${experience.length} work experiences and ${education.length} education entries.\n\n`;
  
  // Skills Assessment
  analysis += `## Skills Assessment\n\n`;
  if (skills.length > 0) {
    analysis += `Identified Skills (${skills.length} total):\n`;
    skills.slice(0, 20).forEach(skill => {
      analysis += `- ${skill}\n`;
    });
    if (skills.length > 20) {
      analysis += `- ...and ${skills.length - 20} more\n`;
    }
  } else {
    analysis += `No clear skills section identified. Consider adding a dedicated skills section.\n`;
  }
  analysis += `\n`;
  
  // Experience Assessment
  analysis += `## Experience Assessment\n\n`;
  if (experience.length > 0) {
    analysis += `Found ${experience.length} work experience entries:\n\n`;
    experience.forEach((exp, idx) => {
      analysis += `**${idx + 1}. ${exp.title || 'Position'}**\n`;
      if (exp.company) analysis += `- Company: ${exp.company}\n`;
      if (exp.duration) analysis += `- Duration: ${exp.duration}\n`;
      analysis += `- Bullet points: ${exp.bullets || 0}\n\n`;
    });
  } else {
    analysis += `No work experience entries clearly identified. Ensure your experience section is well-formatted.\n\n`;
  }
  
  // Education Assessment
  analysis += `## Education\n\n`;
  if (education.length > 0) {
    education.forEach((edu, idx) => {
      analysis += `**${idx + 1}. ${edu.degree || 'Degree'}**\n`;
      if (edu.school) analysis += `- Institution: ${edu.school}\n`;
      if (edu.year) analysis += `- Year: ${edu.year}\n`;
      analysis += `\n`;
    });
  } else {
    analysis += `No education entries clearly identified.\n\n`;
  }
  
  // Job Match Analysis (if job description provided)
  if (jobDescription && keywords.length > 0) {
    analysis += `## Job Match Analysis\n\n`;
    const matchingKeywords = keywords.filter(kw => 
      parsedText.toLowerCase().includes(kw.toLowerCase())
    );
    
    const matchPercentage = Math.round((matchingKeywords.length / keywords.length) * 100);
    
    analysis += `Job Description Keywords Match: ${matchPercentage}%\n\n`;
    analysis += `Matching Keywords (${matchingKeywords.length}/${keywords.length}):\n`;
    matchingKeywords.forEach(kw => {
      analysis += `- ✅ ${kw}\n`;
    });
    
    const missingKeywords = keywords.filter(kw => 
      !parsedText.toLowerCase().includes(kw.toLowerCase())
    );
    
    if (missingKeywords.length > 0) {
      analysis += `\nMissing Keywords:\n`;
      missingKeywords.forEach(kw => {
        analysis += `- ❌ ${kw}\n`;
      });
    }
    analysis += `\n`;
  }
  
  // Recommendations
  analysis += `## Recommendations\n\n`;
  const recommendations = generateRecommendations(parsedText, sections, skills, experience, education);
  recommendations.forEach((rec, idx) => {
    analysis += `${idx + 1}. ${rec}\n`;
  });
  
  return analysis;
}

function extractSections(text) {
  const commonSections = [
    'summary', 'objective', 'experience', 'work experience', 'employment',
    'education', 'skills', 'technical skills', 'projects', 'certifications',
    'achievements', 'awards', 'publications', 'languages'
  ];
  
  const found = [];
  const lowerText = text.toLowerCase();
  
  commonSections.forEach(section => {
    if (lowerText.includes(section)) {
      found.push(section);
    }
  });
  
  return found;
}

function extractSkills(text) {
  const commonSkills = [
    // Programming Languages
    'JavaScript', 'Python', 'Java', 'C\\+\\+', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Go', 'Rust', 'TypeScript',
    // Frontend
    'React', 'Vue', 'Angular', 'HTML', 'CSS', 'SASS', 'jQuery', 'Bootstrap', 'Tailwind',
    // Backend
    'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel', 'FastAPI',
    // Databases
    'MongoDB', 'MySQL', 'PostgreSQL', 'Redis', 'Oracle', 'SQL Server', 'SQLite',
    // Cloud
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Jenkins', 'GitHub Actions',
    // Data Science
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn',
    // Tools
    'Git', 'Linux', 'Agile', 'Scrum', 'JIRA', 'REST API', 'GraphQL', 'Microservices'
  ];
  
  const found = [];
  
  commonSkills.forEach(skill => {
    const regex = new RegExp(`\\b${skill}\\b`, 'i');
    if (regex.test(text)) {
      // Remove escaping for display
      found.push(skill.replace(/\\\\/g, ''));
    }
  });
  
  return found;
}

function extractExperience(text) {
  // Simple heuristic: look for common job title keywords
  const experiences = [];
  const lines = text.split('\n');
  
  const titleKeywords = [
    'engineer', 'developer', 'analyst', 'manager', 'designer', 'architect',
    'lead', 'senior', 'junior', 'intern', 'consultant', 'specialist'
  ];
  
  let currentExp = null;
  
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    
    // Check if line contains a job title
    if (titleKeywords.some(kw => lowerLine.includes(kw))) {
      if (currentExp) {
        experiences.push(currentExp);
      }
      currentExp = {
        title: line.trim(),
        bullets: 0
      };
    } else if (currentExp) {
      // Check for company indicators
      if (lowerLine.includes('company') || lowerLine.includes('inc') || lowerLine.includes('corp')) {
        currentExp.company = line.trim();
      }
      // Check for date/duration
      else if (/\d{4}/.test(line) || lowerLine.includes('present')) {
        currentExp.duration = line.trim();
      }
      // Count bullet points
      else if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
        currentExp.bullets++;
      }
    }
  });
  
  if (currentExp) {
    experiences.push(currentExp);
  }
  
  return experiences;
}

function extractEducation(text) {
  const education = [];
  const lines = text.split('\n');
  
  const degreeKeywords = [
    'bachelor', 'master', 'phd', 'doctorate', 'associate', 'diploma',
    'b.s.', 'b.a.', 'm.s.', 'm.a.', 'mba', 'b.tech', 'm.tech'
  ];
  
  let currentEdu = null;
  
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    
    // Check if line contains a degree
    if (degreeKeywords.some(kw => lowerLine.includes(kw))) {
      if (currentEdu) {
        education.push(currentEdu);
      }
      currentEdu = {
        degree: line.trim()
      };
    } else if (currentEdu) {
      // Check for university/school
      if (lowerLine.includes('university') || lowerLine.includes('college') || lowerLine.includes('institute')) {
        currentEdu.school = line.trim();
      }
      // Check for year
      else if (/\b(19|20)\d{2}\b/.test(line)) {
        currentEdu.year = line.match(/\b(19|20)\d{2}\b/)[0];
      }
    }
  });
  
  if (currentEdu) {
    education.push(currentEdu);
  }
  
  return education;
}

function extractKeywords(jobDescription) {
  if (!jobDescription) return [];
  
  const words = jobDescription
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  // Remove common words
  const stopWords = ['that', 'with', 'from', 'have', 'this', 'will', 'your', 'about', 'they', 'their', 'would', 'there', 'been', 'were'];
  const filtered = words.filter(word => !stopWords.includes(word));
  
  // Get unique words
  const unique = [...new Set(filtered)];
  
  // Return top 20 most relevant
  return unique.slice(0, 20);
}

function generateRecommendations(text, sections, skills, experience, education) {
  const recommendations = [];
  
  // Length check
  if (text.length < 500) {
    recommendations.push('Resume appears short. Consider adding more detail to your experience and achievements.');
  }
  
  // Skills section
  if (!sections.includes('skills') && !sections.includes('technical skills')) {
    recommendations.push('Add a dedicated Skills section near the top of your resume.');
  }
  
  // Summary/Objective
  if (!sections.includes('summary') && !sections.includes('objective')) {
    recommendations.push('Consider adding a professional summary at the top to highlight your key qualifications.');
  }
  
  // Experience details
  if (experience.length > 0) {
    const avgBullets = experience.reduce((sum, exp) => sum + exp.bullets, 0) / experience.length;
    if (avgBullets < 3) {
      recommendations.push('Add more bullet points to your work experience entries (aim for 4-6 per position).');
    }
  }
  
  // Quantify achievements
  const hasNumbers = /\d+%|\d+\+|increased|decreased|reduced|improved/i.test(text);
  if (!hasNumbers) {
    recommendations.push('Quantify your achievements with numbers and percentages (e.g., "Increased sales by 30%").');
  }
  
  // Action verbs
  const weakVerbs = ['worked on', 'responsible for', 'helped with', 'did'];
  const hasWeakVerbs = weakVerbs.some(verb => text.toLowerCase().includes(verb));
  if (hasWeakVerbs) {
    recommendations.push('Use strong action verbs (e.g., "Developed", "Implemented", "Led") instead of passive phrases.');
  }
  
  // Education
  if (education.length === 0) {
    recommendations.push('Ensure your education section is clearly formatted and easy to identify.');
  }
  
  // Projects
  if (!sections.includes('projects')) {
    recommendations.push('Consider adding a Projects section to showcase your practical work and portfolio.');
  }
  
  // Keep it concise
  if (recommendations.length === 0) {
    recommendations.push('Your resume structure looks good! Focus on tailoring content to specific job descriptions.');
    recommendations.push('Continue to update your resume with new achievements and skills.');
    recommendations.push('Have others review your resume for clarity and impact.');
  }
  
  return recommendations;
}

// ============= REPHRASE FALLBACK =============

export function rephraseTextRuleBased(text) {
  const bullets = [];
  
  // Extract existing bullet points or sentences
  const lines = text.split(/[\n\r]+/).filter(line => line.trim().length > 10);
  
  // If input is already bullet points, enhance them
  if (lines.some(line => /^[-•*]/.test(line.trim()))) {
    lines.forEach(line => {
      const cleaned = line.replace(/^[-•*]\s*/, '').trim();
      if (cleaned.length > 10) {
        bullets.push(enhanceBulletPoint(cleaned));
      }
    });
  } else {
    // Convert paragraphs to bullet points
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    sentences.forEach(sentence => {
      const cleaned = sentence.trim();
      if (cleaned.length > 15) {
        bullets.push(enhanceBulletPoint(cleaned));
      }
    });
  }
  
  // Ensure we have 5-8 bullets
  while (bullets.length < 5) {
    bullets.push('Contributed to team objectives and project deliverables');
  }
  
  return bullets.slice(0, 8);
}

function enhanceBulletPoint(text) {
  const actionVerbs = [
    'Developed', 'Implemented', 'Created', 'Led', 'Managed', 'Designed',
    'Built', 'Optimized', 'Improved', 'Reduced', 'Increased', 'Streamlined',
    'Collaborated', 'Coordinated', 'Delivered', 'Achieved', 'Executed'
  ];
  
  // Remove common weak starts
  let enhanced = text
    .replace(/^(worked on|responsible for|helped with|did|was|were|have)\s+/i, '')
    .trim();
  
  // Capitalize first letter
  enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
  
  // If doesn't start with action verb, add one
  const startsWithActionVerb = actionVerbs.some(verb => 
    enhanced.toLowerCase().startsWith(verb.toLowerCase())
  );
  
  if (!startsWithActionVerb) {
    const randomVerb = actionVerbs[Math.floor(Math.random() * actionVerbs.length)];
    enhanced = `${randomVerb} ${enhanced.charAt(0).toLowerCase()}${enhanced.slice(1)}`;
  }
  
  // Ensure it ends with period
  if (!enhanced.endsWith('.')) {
    enhanced += '.';
  }
  
  return enhanced;
}

// ============= COVER LETTER FALLBACK =============

export function generateCoverLetterRuleBased(resumeText, jobDescription) {
  const skills = extractSkills(resumeText).slice(0, 5);
  const experiences = extractExperience(resumeText).slice(0, 2);
  
  let letter = `Dear Hiring Manager,\n\n`;
  
  letter += `I am writing to express my strong interest in the position at your organization. `;
  letter += `With a proven track record in ${skills.slice(0, 3).join(', ')}, `;
  letter += `I am confident that my skills and experience make me an excellent candidate for this role.\n\n`;
  
  if (experiences.length > 0) {
    letter += `In my most recent role`;
    if (experiences[0].company) {
      letter += ` at ${experiences[0].company}`;
    }
    letter += `, I have successfully contributed to multiple projects and initiatives. `;
    letter += `My experience includes working with ${skills.join(', ')}, `;
    letter += `which directly aligns with the requirements of this position.\n\n`;
  }
  
  letter += `Key qualifications that I bring to this role include:\n`;
  skills.forEach(skill => {
    letter += `• Proficiency in ${skill}\n`;
  });
  letter += `• Strong problem-solving and analytical abilities\n`;
  letter += `• Excellent communication and collaboration skills\n`;
  letter += `• Proven ability to deliver results in fast-paced environments\n\n`;
  
  letter += `I am particularly excited about this opportunity because it aligns perfectly with my career goals and expertise. `;
  letter += `I am confident that my background and skills will enable me to make valuable contributions to your team.\n\n`;
  
  letter += `I would welcome the opportunity to discuss how my experience and skills can benefit your organization. `;
  letter += `Thank you for considering my application. I look forward to hearing from you soon.\n\n`;
  
  letter += `Best regards`;
  
  return letter;
}

// ============= INTERVIEW QUESTIONS FALLBACK =============

export function generateInterviewQuestionsRuleBased(jobDescription) {
  const skills = extractKeywords(jobDescription);
  
  let questions = `# Common Interview Questions\n\n`;
  questions += `⚠️ *Note: AI-powered question generation is temporarily unavailable. Here are common interview questions.*\n\n`;
  
  // Technical Questions
  questions += `## Technical Skills Questions\n\n`;
  questions += `1. Can you walk me through your technical background and expertise?\n`;
  questions += `2. Describe a challenging technical problem you've solved recently.\n`;
  questions += `3. What development tools and technologies are you most comfortable with?\n`;
  questions += `4. How do you stay updated with the latest industry trends and technologies?\n`;
  questions += `5. Can you explain your approach to debugging and troubleshooting?\n\n`;
  
  // Behavioral Questions
  questions += `## Behavioral Questions\n\n`;
  questions += `6. Tell me about a time when you had to work under a tight deadline.\n`;
  questions += `7. Describe a situation where you had to collaborate with a difficult team member.\n`;
  questions += `8. Give an example of when you took initiative on a project.\n`;
  questions += `9. How do you prioritize multiple tasks and projects?\n`;
  questions += `10. Tell me about a failure and what you learned from it.\n\n`;
  
  // Role-Specific Questions
  questions += `## Role-Specific Questions\n\n`;
  questions += `11. Why are you interested in this position?\n`;
  questions += `12. What do you know about our company and our products/services?\n`;
  questions += `13. How would you approach [specific challenge mentioned in job description]?\n`;
  questions += `14. What relevant experience do you have for this role?\n`;
  questions += `15. Where do you see yourself in 3-5 years?\n\n`;
  
  // Problem-Solving Questions
  questions += `## Problem-Solving Questions\n\n`;
  questions += `16. How do you approach learning a new technology or skill?\n`;
  questions += `17. Describe your problem-solving process.\n`;
  questions += `18. How do you handle feedback and criticism?\n`;
  questions += `19. What's your approach to testing and quality assurance?\n`;
  questions += `20. How do you balance technical excellence with meeting deadlines?\n\n`;
  
  // If job description has specific skills, add targeted questions
  if (skills.length > 0) {
    questions += `## Targeted Questions (Based on Job Description)\n\n`;
    skills.slice(0, 5).forEach((skill, idx) => {
      questions += `${21 + idx}. What is your experience with ${skill}? (Assesses: ${skill} expertise)\n`;
    });
  }
  
  return questions;
}

// ============= EXPORT =============

export default {
  analyzeResumeRuleBased,
  rephraseTextRuleBased,
  generateCoverLetterRuleBased,
  generateInterviewQuestionsRuleBased
};
