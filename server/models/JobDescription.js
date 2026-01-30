import mongoose from 'mongoose';

/**
 * JobDescription Model
 * Stores parsed job description with extracted requirements
 * NO HARD-CODED ROLES - Everything extracted from actual JD text
 */

const jobDescriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Original data
  rawText: {
    type: String,
    required: true,
  },
  
  sourceUrl: String,
  companyName: String,
  
  // Parsed structured data
  jobTitle: {
    type: String,
    required: true,
  },
  
  requirements: {
    // Skills extracted from JD
    requiredSkills: {
      technical: [String],
      soft: [String],
      tools: [String],
      frameworks: [String],
      languages: [String],
    },
    
    preferredSkills: {
      technical: [String],
      soft: [String],
      tools: [String],
      frameworks: [String],
      languages: [String],
    },
    
    // Experience requirements
    minExperience: Number, // years
    maxExperience: Number,
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'principal'],
    },
    
    // Education requirements
    minEducation: {
      type: String,
      enum: ['high-school', 'associate', 'bachelors', 'masters', 'phd', 'none'],
    },
    requiredDegrees: [String],
    preferredDegrees: [String],
  },
  
  responsibilities: [String],
  
  // Extracted keywords for matching (frequency-based)
  keywordFrequency: {
    type: Map,
    of: Number,
  },
  
  // Detected job domain/category
  detectedDomain: {
    primary: String, // e.g., "software-engineering"
    secondary: [String], // e.g., ["frontend", "react"]
  },
  
  // Metadata
  parsingMetadata: {
    parsedAt: {
      type: Date,
      default: Date.now,
    },
    parsingMethod: {
      type: String,
      enum: ['regex', 'nlp', 'hybrid'],
      default: 'hybrid',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    sectionsDetected: {
      hasResponsibilities: Boolean,
      hasRequirements: Boolean,
      hasPreferred: Boolean,
      hasExperience: Boolean,
      hasEducation: Boolean,
    },
  },
  
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
jobDescriptionSchema.index({ userId: 1, isActive: 1 });
jobDescriptionSchema.index({ jobTitle: 'text', 'requirements.requiredSkills.technical': 'text' });
jobDescriptionSchema.index({ 'detectedDomain.primary': 1 });

// Methods
jobDescriptionSchema.methods.getAllRequiredSkills = function() {
  const skills = [];
  if (this.requirements.requiredSkills) {
    Object.values(this.requirements.requiredSkills).forEach(skillArray => {
      skills.push(...skillArray);
    });
  }
  return [...new Set(skills)];
};

jobDescriptionSchema.methods.getAllPreferredSkills = function() {
  const skills = [];
  if (this.requirements.preferredSkills) {
    Object.values(this.requirements.preferredSkills).forEach(skillArray => {
      skills.push(...skillArray);
    });
  }
  return [...new Set(skills)];
};

jobDescriptionSchema.methods.getTopKeywords = function(limit = 10) {
  if (!this.keywordFrequency) return [];
  
  return Array.from(this.keywordFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(entry => entry[0]);
};

export default mongoose.model('JobDescription', jobDescriptionSchema);
