import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import questionRoutes from './routes/questions.js';
import progressRoutes from './routes/progress.js';
import interviewRoutes from './routes/interviews.js';
import researchRoutes from './routes/research.js';
import aiRoutes from './routes/ai.js';
import collaborationRoutes from './routes/collaboration.js';
import gamificationRoutes from './routes/gamification.js';
import resumeRoutes from './routes/resume.js';
import analyticsRoutes from './routes/analytics.js';
import interviewPrepRoutes from './routes/interviewPrep.js';
import conversationalInterviewRoutes from './routes/conversationalInterview.js';
import liveInterviewRoutes from './routes/liveInterview.js';
import improvedInterviewRoutes from './routes/improvedInterview.js';
import mediaRoutes from './routes/media.js';
import dsaProgressRoutes from './routes/dsaProgress.js';
import { initializeFirebase } from './config/firebase.js';
import { initializeOpenAI } from './config/openai.js';
import { setupCollaborationHandlers } from './sockets/collaborationHandlers.js';
import { setupInterviewHandlers } from './sockets/interviewHandlers.js';
import setupInterviewSocket from './sockets/interviewSocket.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root directory
dotenv.config({ path: resolve(__dirname, '../.env') });

// Verify critical environment variables
console.log('🔍 Environment Configuration Check:');
console.log('   PORT:', process.env.PORT || '5000 (default)');
console.log('   MONGODB_URI:', process.env.MONGODB_URI ? '✅ Configured' : '❌ MISSING');
console.log('   OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Configured (' + process.env.OPENAI_API_KEY.substring(0, 20) + '...)' : '❌ MISSING');
console.log('   FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ Configured' : '❌ MISSING');
console.log('');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000', 
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', 
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());

// Initialize Firebase and OpenAI
console.log('🔧 Initializing External Services...');
const firebaseInitialized = initializeFirebase();
const openaiInitialized = initializeOpenAI();

if (!firebaseInitialized) {
  console.warn('⚠️  Warning: Firebase not initialized. Authentication may not work properly.');
}

if (!openaiInitialized) {
  console.warn('⚠️  Warning: OpenAI not initialized. AI features will use mock responses.');
}

// Setup Socket.IO handlers
setupCollaborationHandlers(io);
setupInterviewHandlers(io); // Legacy real-time interview handlers
setupInterviewSocket(io); // NEW: Improved dynamic interview handlers

// MongoDB Connection with SSL/TLS Configuration
let connectionAttempts = 0;
const MAX_ATTEMPTS = 3;

const connectDB = async () => {
  try {
    connectionAttempts++;
    
    // Check if MONGODB_URI is configured
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    const mongoOptions = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority',
      ssl: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
    };

    // Try MongoDB Atlas first
    let mongoURI = process.env.MONGODB_URI;
    
    // If Atlas connection fails after max attempts, try local MongoDB
    if (connectionAttempts > MAX_ATTEMPTS && mongoURI.includes('mongodb+srv')) {
      console.log('⚠️  Switching to local MongoDB...');
      mongoURI = 'mongodb://localhost:27017/prepforge';
    }

    console.log(`🔌 Connecting to MongoDB (Attempt ${connectionAttempts}/${MAX_ATTEMPTS})...`);
    await mongoose.connect(mongoURI, mongoOptions);
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📍 Database: ${mongoURI.includes('localhost') ? 'Local MongoDB' : 'MongoDB Atlas'}`);
    console.log(`📊 Database Name: ${mongoose.connection.name}`);
    connectionAttempts = 0; // Reset on success
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    
    if (connectionAttempts <= MAX_ATTEMPTS) {
      console.error('💡 Troubleshooting Tips:');
      console.error('   1. Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for testing)');
      console.error('   2. Verify connection string in .env file');
      console.error('   3. Ensure database user has correct permissions');
      console.error('   4. Check if MongoDB Atlas cluster is active');
      console.error(`   5. Connection attempt ${connectionAttempts}/${MAX_ATTEMPTS}`);
      
      // Retry
      console.log('🔄 Retrying connection in 5 seconds...');
      setTimeout(connectDB, 5000);
    } else {
      console.error('⚠️  Could not connect to MongoDB Atlas. Trying local MongoDB...');
      setTimeout(connectDB, 2000);
    }
  }
};

connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/ai', aiRoutes); // AI Features (Roadmap, Adaptive Selector, Mistake Analysis, etc.)
app.use('/api/collaboration', collaborationRoutes); // Real-time Collaboration
app.use('/api/gamification', gamificationRoutes); // Gamification System
app.use('/api/resumes', resumeRoutes); // AI Resume Builder
app.use('/api/analytics', analyticsRoutes); // Advanced Analytics Dashboard
app.use('/api/interview-prep', interviewPrepRoutes); // Resume Upload & ATS Scoring
app.use('/api/interview/conversational', conversationalInterviewRoutes); // Conversational Interviews (Legacy)
app.use('/api/interview', liveInterviewRoutes); // Real-Time Adaptive Interviews (V2)
app.use('/api/interview/v3', improvedInterviewRoutes); // NEW: Fully Dynamic Interviews (V3)
app.use('/api/media', mediaRoutes); // NEW: Media upload for video interviews
app.use('/api/dsa-progress', dsaProgressRoutes); // DSA Sheets & Playlist Progress Tracking

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'PrepForge AI-Powered Interview Platform',
    version: '2.0.0',
    features: [
      'Smart Roadmap Generator',
      'Adaptive Question Selector',
      'Mistake Pattern Analysis',
      'AI Interview Question Generator',
      'Interview Feedback Engine',
      'Readiness Predictor',
      'AI Study Companion',
      'Video Interviews (Live & Async)',
      'Research Analytics Dashboard'
    ]
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.IO enabled for real-time collaboration`);
});
