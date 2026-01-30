import mongoose from 'mongoose';

/**
 * ParsedResume Model
 * Stores structured resume data extracted from uploaded documents
 * Used for ATS scoring and skill matching
 */
const parsedResumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Version tracking
  versionNumber: { type: Number, required: true, default: 1 },
  parentResumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParsedResume' },
  isLatest: { type: Boolean, default: true, index: true },
  
  // Format detection
  detectedFormat: {
    type: { type: String, enum: ['western-standard', 'europass', 'indian-standard', 'resume-builder', 'unknown'], default: 'unknown' },
    confidence: { type: Number, min: 0, max: 100 },
    formatIndicators: {
      hasPhoto: Boolean,
      hasSummary: Boolean,
      sectionOrder: [String],
      language: String
    }
  },
  
  // Extraction quality metrics
  extractionQuality: {
    overall: { type: Number, min: 0, max: 100 },
    sectionScores: {
      contact: Number,
      education: Number,
      experience: Number,
      skills: Number
    },
    failedSections: [String],
    warnings: [String]
  },
  
  // Original file metadata
  originalFile: {
    filename: String,
    mimeType: String,
    uploadDate: { type: Date, default: Date.now },
    fileSize: Number,
  },
  
  // Extracted text content
  rawText: {
    type: String,
    required: true,
  },
  
  // Parsed structured data
  parsedData: {
    // Contact Information
    contact: {
      name: String,
      email: String,
      phone: String,
      location: String,
      linkedin: String,
      github: String,
      portfolio: String,
    },
    
    // Education
    education: [{
      degree: String,
      major: String,
      institution: String,
      graduationYear: Number,
      gpa: String,
      location: String,
    }],
    
    // Work Experience
    experience: [{
      title: String,
      company: String,
      location: String,
      startDate: String,
      endDate: String,
      isCurrent: Boolean,
      duration: String, // calculated
      responsibilities: [String],
      achievements: [String],
    }],
    
    // Skills (categorized with verification)
    skills: {
      programming: [{
        name: String,
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        verificationSource: String, // 'interview' | 'project' | 'certification'
        proficiencyLevel: String    // 'beginner' | 'intermediate' | 'advanced' | 'expert'
      }],
      frameworks: [{
        name: String,
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        verificationSource: String,
        proficiencyLevel: String
      }],
      databases: [String],
      tools: [String],
      cloud: [String],
      softSkills: [String],
      other: [String],
    },
    
    // Projects
    projects: [{
      name: String,
      description: String,
      technologies: [String],
      link: String,
      startDate: String,
      endDate: String,
    }],
    
    // Certifications
    certifications: [{
      name: String,
      issuer: String,
      date: String,
      expiryDate: String,
      credentialId: String,
    }],
    
    // Publications (for research roles)
    publications: [{
      title: String,
      venue: String,
      year: Number,
      authors: [String],
      link: String,
    }],
  },
  
  // ATS Analysis Results
  atsScore: {
    totalScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    
    // Component scores (transparent breakdown)
    componentScores: {
      skillsScore: Number,        // Weight: 30%
      experienceScore: Number,    // Weight: 25%
      educationScore: Number,     // Weight: 20%
      structureScore: Number,     // Weight: 15%
      keywordsScore: Number,      // Weight: 10%
    },
    
    // Detailed explanations
    scoreExplanation: {
      strengths: [String],
      weaknesses: [String],
      suggestions: [String],
    },
    
    // Formatting analysis
    formatAnalysis: {
      hasSections: Boolean,
      hasContactInfo: Boolean,
      hasExperience: Boolean,
      hasEducation: Boolean,
      hasSkills: Boolean,
      readabilityScore: Number,
      wordCount: Number,
    },
  },
  
  // Skill extraction metadata
  skillExtractionMeta: {
    totalSkillsFound: Number,
    skillsByCategory: Map,
    extractionMethod: String, // 'keyword', 'nlp', 'hybrid'
    confidence: Number,
  },
  
  // Version tracking (for resume iterations)
  version: {
    type: Number,
    default: 1,
  },
  isLatest: {
    type: Boolean,
    default: true,
  },
  
  // Status
  status: {
    type: String,
    enum: ['parsed', 'analyzed', 'archived'],
    default: 'parsed',
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
});

// Indexes for performance
parsedResumeSchema.index({ userId: 1, isLatest: 1 });
parsedResumeSchema.index({ 'parsedData.skills.programming': 1 });
parsedResumeSchema.index({ 'atsScore.totalScore': -1 });

// Virtual for total years of experience
parsedResumeSchema.virtual('totalYearsExperience').get(function() {
  if (!this.parsedData.experience || this.parsedData.experience.length === 0) {
    return 0;
  }
  
  let totalMonths = 0;
  this.parsedData.experience.forEach(exp => {
    if (exp.duration) {
      // Parse duration like "2 years 3 months" or "6 months"
      const yearsMatch = exp.duration.match(/(\d+)\s*year/i);
      const monthsMatch = exp.duration.match(/(\d+)\s*month/i);
      
      if (yearsMatch) totalMonths += parseInt(yearsMatch[1]) * 12;
      if (monthsMatch) totalMonths += parseInt(monthsMatch[1]);
    }
  });
  
  return (totalMonths / 12).toFixed(1);
});

// Method: Get all skills as flat array
parsedResumeSchema.methods.getAllSkills = function() {
  const skills = this.parsedData.skills;
  return [
    ...skills.programming,
    ...skills.frameworks,
    ...skills.databases,
    ...skills.tools,
    ...skills.cloud,
    ...skills.other,
  ];
};

// Method: Calculate ATS score
parsedResumeSchema.methods.calculateATSScore = function() {
  const scores = {};
  
  // 1. Skills Score (30%)
  const totalSkills = this.getAllSkills().length;
  scores.skillsScore = Math.min((totalSkills / 20) * 100, 100);
  
  // 2. Experience Score (25%)
  const yearsExp = parseFloat(this.totalYearsExperience);
  scores.experienceScore = Math.min((yearsExp / 5) * 100, 100);
  
  // 3. Education Score (20%)
  const hasEducation = this.parsedData.education.length > 0;
  const hasDegree = this.parsedData.education.some(ed => ed.degree);
  scores.educationScore = hasEducation ? (hasDegree ? 100 : 60) : 0;
  
  // 4. Structure Score (15%)
  const format = this.atsScore.formatAnalysis;
  const structureChecks = [
    format.hasSections,
    format.hasContactInfo,
    format.hasExperience,
    format.hasEducation,
    format.hasSkills,
  ];
  const passedChecks = structureChecks.filter(Boolean).length;
  scores.structureScore = (passedChecks / structureChecks.length) * 100;
  
  // 5. Keywords Score (10%)
  const wordCount = format.wordCount || 0;
  const idealRange = wordCount >= 300 && wordCount <= 800;
  scores.keywordsScore = idealRange ? 100 : Math.max(0, 100 - Math.abs(wordCount - 550) / 10);
  
  // Calculate weighted total
  const totalScore = 
    scores.skillsScore * 0.30 +
    scores.experienceScore * 0.25 +
    scores.educationScore * 0.20 +
    scores.structureScore * 0.15 +
    scores.keywordsScore * 0.10;
  
  return {
    totalScore: Math.round(totalScore),
    componentScores: {
      skillsScore: Math.round(scores.skillsScore),
      experienceScore: Math.round(scores.experienceScore),
      educationScore: Math.round(scores.educationScore),
      structureScore: Math.round(scores.structureScore),
      keywordsScore: Math.round(scores.keywordsScore),
    },
  };
};

export default mongoose.model('ParsedResume', parsedResumeSchema);
