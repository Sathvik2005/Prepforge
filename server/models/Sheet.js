import mongoose from 'mongoose';

const problemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    required: true
  },
  solveLink: {
    type: String,
    required: true
  },
  editorialLink: {
    type: String
  },
  postLink: {
    type: String
  },
  youtubeLink: {
    type: String
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  tags: {
    type: [String],
    default: []
  }
}, { _id: false });

const sectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  problems: {
    type: [problemSchema],
    default: []
  }
}, { _id: false });

const sheetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['dsa', 'interview', 'competitive', 'system-design'],
    default: 'dsa'
  },
  totalProblems: {
    type: Number,
    required: true
  },
  sections: {
    type: [sectionSchema],
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
sheetSchema.index({ slug: 1 });
sheetSchema.index({ type: 1 });

export default mongoose.model('Sheet', sheetSchema);
