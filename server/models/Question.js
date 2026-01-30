import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
      required: true,
      enum: [
        'Arrays',
        'Strings',
        'LinkedLists',
        'Trees',
        'Graphs',
        'DynamicProgramming',
        'Greedy',
        'Sorting',
        'Searching',
        'SystemDesign',
        'JavaScript',
        'React',
        'Databases',
      ],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
    },
    type: {
      type: String,
      enum: ['mcq', 'coding', 'behavioral'],
      required: true,
    },
    options: [String], // For MCQ
    correctAnswer: mongoose.Schema.Types.Mixed, // Index for MCQ, null for coding
    explanation: String,
    hints: [String],
    testCases: [
      {
        input: String,
        output: String,
      },
    ],
    companies: [String],
    tags: [String],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Question', questionSchema);
