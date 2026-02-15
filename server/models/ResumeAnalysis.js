import mongoose from 'mongoose';

const ProvenanceSchema = new mongoose.Schema({
  hfSpace: { type: String, default: 'thisrudrapatel/Resume-Genome' },
  endpointsUsed: [String],
  parameters: {
    temperature: Number,
    max_tokens: Number,
    with_job_description: Boolean
  },
  timestamp: { type: Date, default: Date.now }
});

const ResumeAnalysisSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // Firebase UID
  resumeText: { type: String, required: true },
  jobDescription: String,
  fileName: String,
  fileSize: Number,
  
  // Analysis results
  analysis: {
    general: String,
    withJD: String,
    lastUpdated: Date
  },
  
  // Generated content
  rephrased: [{
    original: String,
    rephrased: String,
    timestamp: Date
  }],
  
  coverLetter: {
    content: String,
    generatedAt: Date
  },
  
  interviewQuestions: {
    content: String,
    generatedAt: Date
  },
  
  // PDF reports
  pdfReports: [{
    url: String,
    generatedAt: Date,
    includesJD: Boolean
  }],
  
  // Provenance tracking
  provenance: ProvenanceSchema,
  
  // Metadata
  status: { type: String, enum: ['draft', 'saved', 'archived'], default: 'saved' },
  tags: [String],
  notes: String,
  
  // Audit trail
  auditLog: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Indexes for performance
ResumeAnalysisSchema.index({ userId: 1, createdAt: -1 });
ResumeAnalysisSchema.index({ status: 1 });
ResumeAnalysisSchema.index({ 'provenance.timestamp': -1 });

// Add audit entry method
ResumeAnalysisSchema.methods.addAudit = function(action, details = {}) {
  this.auditLog.push({
    action,
    details,
    timestamp: new Date()
  });
};

export default mongoose.model('ResumeAnalysis', ResumeAnalysisSchema);
