import mongoose from 'mongoose';

const ResumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    default: 'My Resume',
  },
  templateId: {
    type: String,
    enum: ['modern', 'classic', 'minimal', 'technical', 'creative'],
    default: 'modern',
  },
  // Personal Information
  personalInfo: {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    location: String,
    linkedIn: String,
    github: String,
    portfolio: String,
    website: String,
  },
  // Professional Summary
  summary: {
    type: String,
    maxlength: 500,
  },
  // Work Experience
  experience: [{
    company: { type: String, required: true },
    position: { type: String, required: true },
    location: String,
    startDate: { type: Date, required: true },
    endDate: Date,
    isCurrent: { type: Boolean, default: false },
    description: String,
    bulletPoints: [String],
    technologies: [String],
    aiGenerated: { type: Boolean, default: false },
  }],
  // Education
  education: [{
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    field: String,
    location: String,
    startDate: Date,
    endDate: Date,
    isCurrent: { type: Boolean, default: false },
    gpa: String,
    achievements: [String],
  }],
  // Skills
  skills: {
    technical: [String],
    languages: [String],
    frameworks: [String],
    tools: [String],
    soft: [String],
  },
  // Projects
  projects: [{
    name: { type: String, required: true },
    description: String,
    technologies: [String],
    link: String,
    github: String,
    startDate: Date,
    endDate: Date,
    bulletPoints: [String],
    aiGenerated: { type: Boolean, default: false },
  }],
  // Certifications
  certifications: [{
    name: { type: String, required: true },
    issuer: String,
    date: Date,
    expiryDate: Date,
    credentialId: String,
    link: String,
  }],
  // Additional Sections
  awards: [{
    title: String,
    issuer: String,
    date: Date,
    description: String,
  }],
  publications: [{
    title: String,
    publisher: String,
    date: Date,
    link: String,
  }],
  volunteering: [{
    organization: String,
    role: String,
    startDate: Date,
    endDate: Date,
    description: String,
  }],
  // ATS Optimization
  atsScore: {
    overall: { type: Number, default: 0, min: 0, max: 100 },
    keywords: { type: Number, default: 0, min: 0, max: 100 },
    formatting: { type: Number, default: 0, min: 0, max: 100 },
    content: { type: Number, default: 0, min: 0, max: 100 },
    lastCalculated: Date,
  },
  targetJobDescription: String,
  matchedKeywords: [String],
  missingKeywords: [String],
  // AI Enhancement History
  aiEnhancements: [{
    field: String,
    originalText: String,
    enhancedText: String,
    timestamp: { type: Date, default: Date.now },
    accepted: { type: Boolean, default: false },
  }],
  // Metadata
  isPublic: { type: Boolean, default: false },
  isPrimary: { type: Boolean, default: false },
  lastExported: Date,
  exportCount: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Indexes
ResumeSchema.index({ userId: 1, isPrimary: 1 });
ResumeSchema.index({ userId: 1, createdAt: -1 });

// Methods
ResumeSchema.methods.calculateATSScore = function(jobDescription) {
  // Simple ATS scoring algorithm
  const resume = this;
  let keywordScore = 0;
  let formattingScore = 85; // Base score for good formatting
  let contentScore = 0;
  
  // Keyword matching
  if (jobDescription) {
    const jobKeywords = jobDescription.toLowerCase().match(/\b\w+\b/g) || [];
    const resumeText = JSON.stringify(resume).toLowerCase();
    const matchedKeywords = jobKeywords.filter(kw => 
      kw.length > 3 && resumeText.includes(kw)
    );
    keywordScore = Math.min(100, (matchedKeywords.length / Math.max(jobKeywords.length, 1)) * 100);
  }
  
  // Content completeness
  const sections = {
    summary: !!resume.summary,
    experience: resume.experience.length > 0,
    education: resume.education.length > 0,
    skills: Object.values(resume.skills).some(arr => arr.length > 0),
    projects: resume.projects.length > 0,
  };
  contentScore = (Object.values(sections).filter(Boolean).length / 5) * 100;
  
  // Overall score
  const overall = Math.round((keywordScore * 0.4 + formattingScore * 0.3 + contentScore * 0.3));
  
  resume.atsScore = {
    overall,
    keywords: Math.round(keywordScore),
    formatting: formattingScore,
    content: Math.round(contentScore),
    lastCalculated: new Date(),
  };
  
  return resume.atsScore;
};

ResumeSchema.methods.extractKeywords = function(jobDescription) {
  if (!jobDescription) return { matched: [], missing: [] };
  
  const resumeText = JSON.stringify(this).toLowerCase();
  const jobKeywords = jobDescription.toLowerCase()
    .match(/\b\w+\b/g)
    ?.filter(kw => kw.length > 3) || [];
  
  const uniqueKeywords = [...new Set(jobKeywords)];
  const matched = uniqueKeywords.filter(kw => resumeText.includes(kw));
  const missing = uniqueKeywords.filter(kw => !resumeText.includes(kw));
  
  this.matchedKeywords = matched.slice(0, 50);
  this.missingKeywords = missing.slice(0, 50);
  
  return { matched, missing };
};

const Resume = mongoose.model('Resume', ResumeSchema);

export default Resume;
