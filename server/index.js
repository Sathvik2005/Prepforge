import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root directory FIRST (before other imports)
dotenv.config({ path: resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
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
import sheetsRoutes from './routes/sheets.js';
import roadmapRoutes from './routes/roadmap.js';
import trackingRoutes from './routes/tracking.js';
// import resumeAnalysisRoutes from './routes/resumeAnalysis.js'; // Temporarily disabled - using resumeGenome instead
import resumeGenomeRoutes from './routes/resumeGenome.js';
import codeExecutionRoutes from './routes/codeExecution.js';
import { initializeFirebase } from '././config/firebase.js';
import { initializeOpenAI } from './config/openai.js';
import { setupCollaborationHandlers } from './sockets/collaborationHandlers.js';
import { setupInterviewHandlers } from './sockets/interviewHandlers.js';
import setupInterviewSocket from './sockets/interviewSocket.js';
import socketAuthMiddleware from './middleware/socketAuth.js';

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
      'http://localhost:3001',
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Apply Socket.IO authentication middleware
io.use(socketAuthMiddleware);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
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

// Make IO instance available to routes
app.set('io', io);

// ─── MongoDB Connection ──────────────────────────────────────────────────────
// Atlas options — TLS required for Atlas M0 on Node v25 / OpenSSL 3
const atlasOptions = {
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
  socketTimeoutMS: 60000,
  family: 4,
  maxPoolSize: 10,
  tls: true,
  tlsAllowInvalidCertificates: true,
};

// Local in-memory options — NO TLS (MongoMemoryServer uses plain TCP)
const localOptions = {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 60000,
  family: 4,
  maxPoolSize: 10,
};

let _dbReady = false;
let _memoryServer = null;
// Sequential counter: each startMemoryFallback call gets a unique ID;
// only the most recent one is allowed to complete.
let _fallbackSeq = 0;

async function startMemoryFallback() {
  const mySeq = ++_fallbackSeq;
  _dbReady = false;
  try {
    // Stop previous in-memory server without triggering reconnect logic
    if (_memoryServer) {
      const old = _memoryServer;
      _memoryServer = null;
      await old.stop().catch(() => {});
    }
    // Disconnect from current URI before reconnecting
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close().catch(() => {});
    }
    // Bail out if a newer invocation has started
    if (mySeq !== _fallbackSeq) return;

    const { MongoMemoryServer } = await import('mongodb-memory-server');
    _memoryServer = await MongoMemoryServer.create({ instance: { dbName: 'prepforge' } });
    if (mySeq !== _fallbackSeq) { await _memoryServer.stop().catch(() => {}); _memoryServer = null; return; }

    await mongoose.connect(_memoryServer.getUri(), localOptions);
    if (mySeq !== _fallbackSeq) return;

    _dbReady = true;
    console.log('✅ Local in-memory MongoDB started (demo mode — data resets on restart)');
    console.log('   ⚡ Resume your Atlas cluster at https://cloud.mongodb.com to restore real data');
  } catch (err) {
    if (mySeq === _fallbackSeq) console.error('❌ Local fallback failed:', err.message);
  }
}

async function connectDB() {
  const MONGO_URI = process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.warn('⚠️  MONGODB_URI not set — starting local fallback');
    return startMemoryFallback();
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close().catch(() => {});
      }
      console.log(`🔌 Connecting to MongoDB Atlas... (attempt ${attempt}/3)`);
      await mongoose.connect(MONGO_URI, atlasOptions);
      _dbReady = true;
      console.log(`✅ MongoDB Atlas Connected → ${mongoose.connection.name}`);
      return;
    } catch (err) {
      console.warn(`⚠️  Atlas attempt ${attempt} failed: ${err.message.slice(0, 80)}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Try a local MongoDB instance before falling back to in-memory
  console.warn('⚠️  Atlas unreachable — trying local MongoDB at localhost:27017...');
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close().catch(() => {});
    }
    await mongoose.connect('mongodb://localhost:27017/prepforge', localOptions);
    _dbReady = true;
    console.log('✅ Local MongoDB connected (data persists across restarts · localhost:27017/prepforge)');
    return; // Local MongoDB is good — no need for in-memory or retryAtlas
  } catch (localErr) {
    console.warn(`⚠️  Local MongoDB unavailable (${localErr.message.slice(0, 50)}) — starting in-memory fallback...`);
  }

  await startMemoryFallback();

  // Retry Atlas every 60s ONLY to upgrade from in-memory to real Atlas when cluster resumes
  const retryAtlas = async () => {
    // Already on real Atlas (no memory server)? Stop retrying.
    if (_dbReady && !_memoryServer) return;
    try {
      // Bump sequence so any in-progress fallback aborts
      _fallbackSeq++;
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close().catch(() => {});
      }
      if (_memoryServer) { const old = _memoryServer; _memoryServer = null; await old.stop().catch(() => {}); }
      await mongoose.connect(MONGO_URI, atlasOptions);
      _dbReady = true;
      console.log(`✅ MongoDB Atlas reconnected → ${mongoose.connection.name} (real data restored)`);
      // Successfully upgraded to Atlas — stop the retry loop
    } catch {
      // Atlas still unreachable — keep the existing in-memory server running (don't restart it)
      if (!_memoryServer) {
        // Memory server died for another reason — restart it
        await startMemoryFallback();
      } else {
        // Memory server is fine; just schedule next Atlas retry quietly
        _dbReady = true; // make sure requests aren't blocked
      }
      setTimeout(retryAtlas, 120000); // Retry every 2 minutes instead of 60s
    }
  };
  setTimeout(retryAtlas, 120000); // First retry after 2 minutes
}

connectDB();

// Only log; do NOT auto-restart on disconnect — avoids infinite loops.
// Memory server doesn't spontaneously disconnect; Atlas reconnect is handled by retryAtlas.
mongoose.connection.on('disconnected', () => {
  if (_dbReady) {
    _dbReady = false;
    console.warn('⚠️  MongoDB disconnected (will recover automatically)');
  }
});
mongoose.connection.on('reconnected',  () => { _dbReady = true; console.log('✅ MongoDB reconnected'); });
mongoose.connection.on('connected',    () => { _dbReady = true; });
mongoose.connection.on('error', (err) => {
  const m = err.message || '';
  if (!m.includes('ECONNRESET') && !m.includes('SSL') && !m.includes('ssl')) {
    console.error('🔴 MongoDB error:', m.slice(0, 100));
  }
});

// DB wait middleware — waits up to 45s for DB before returning 503
app.use(async (req, res, next) => {
  if (req.path === '/api/health') return next();
  if (mongoose.connection.readyState === 1) return next();
  let waited = 0;
  while (mongoose.connection.readyState !== 1 && waited < 45000) {
    await new Promise(r => setTimeout(r, 300));
    waited += 300;
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database starting up, please retry in a moment.', retry: true });
  }
  next();
});

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
app.use('/api/sheets', sheetsRoutes); // DSA Sheets Management & Progress
app.use('/api/roadmap', roadmapRoutes); // AI Roadmap Generator
app.use('/api/tracking', trackingRoutes); // Real-time User Activity Tracking
// app.use('/api/resume-analysis', resumeAnalysisRoutes); // Temporarily disabled - using resumeGenome instead
app.use('/api/resume-genome', resumeGenomeRoutes); // Resume Analysis with OpenAI
app.use('/api/code-execution', codeExecutionRoutes); // Secure Code Execution & Analysis

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
