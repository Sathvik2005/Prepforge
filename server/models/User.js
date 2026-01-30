import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false, // Optional for Firebase users
      minlength: 6,
    },
    firebaseUid: {
      type: String,
      sparse: true, // Allow null but maintain uniqueness when present
      unique: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    authProvider: {
      type: String,
      enum: ['local', 'firebase', 'google'],
      default: 'local',
    },
    bio: {
      type: String,
      default: '',
    },
    goal: {
      type: String,
      default: '',
    },
    targetDate: {
      type: Date,
    },
    stats: {
      questionsSolved: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 },
      studyHours: { type: Number, default: 0 },
      streak: { type: Number, default: 0 },
      xp: { type: Number, default: 0 },
      lastActive: { type: Date, default: Date.now },
    },
    badges: [
      {
        name: String,
        earnedAt: Date,
      },
    ],
    resume: {
      filename: String,
      uploadedAt: Date,
      skillGaps: {
        missing: [String],
        weak: [String],
        strong: [String],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving (only for local auth)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
