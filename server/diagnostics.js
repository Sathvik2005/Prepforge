/**
 * Backend Diagnostics Script
 * Tests all backend services and configurations
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

console.log('\n');
console.log('═══════════════════════════════════════════════════════════════');
console.log('           PrepForge Backend Diagnostics Report');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// 1. Environment Variables Check
console.log('📋 STEP 1: Environment Variables');
console.log('─────────────────────────────────────────────────────────────');

const envVars = {
  'PORT': process.env.PORT,
  'NODE_ENV': process.env.NODE_ENV,
  'MONGODB_URI': process.env.MONGODB_URI,
  'JWT_SECRET': process.env.JWT_SECRET,
  'FIREBASE_PROJECT_ID': process.env.FIREBASE_PROJECT_ID,
  'FIREBASE_CLIENT_EMAIL': process.env.FIREBASE_CLIENT_EMAIL,
  'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
  'VITE_API_URL': process.env.VITE_API_URL,
};

let envCheckPassed = true;

for (const [key, value] of Object.entries(envVars)) {
  const status = value ? '✅' : '❌';
  const displayValue = value 
    ? (key.includes('KEY') || key.includes('SECRET') || key.includes('URI')) 
      ? `${value.substring(0, 20)}...` 
      : value
    : 'MISSING';
  
  console.log(`   ${status} ${key.padEnd(25)} ${displayValue}`);
  
  if (!value && key !== 'VITE_API_URL') {
    envCheckPassed = false;
  }
}

console.log('');
console.log(`   Overall Status: ${envCheckPassed ? '✅ PASSED' : '❌ FAILED - Missing required variables'}`);
console.log('');

// 2. MongoDB Connection Test
console.log('📋 STEP 2: MongoDB Connection');
console.log('─────────────────────────────────────────────────────────────');

let mongoCheckPassed = false;

if (process.env.MONGODB_URI) {
  try {
    console.log('   🔌 Connecting to MongoDB...');
    
    const mongoOptions = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      w: 'majority',
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
    };

    await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    
    console.log('   ✅ MongoDB Connected');
    console.log(`   📍 Host: ${mongoose.connection.host}`);
    console.log(`   📊 Database: ${mongoose.connection.name}`);
    console.log(`   🔗 Connection State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
    // Test write operation
    const testCollection = mongoose.connection.db.collection('diagnostics_test');
    const testDoc = { test: 'diagnostics', timestamp: new Date() };
    await testCollection.insertOne(testDoc);
    console.log('   ✅ Write Test: Successful');
    
    // Test read operation
    const readDoc = await testCollection.findOne({ test: 'diagnostics' });
    console.log('   ✅ Read Test: Successful');
    
    // Clean up test document
    await testCollection.deleteOne({ test: 'diagnostics' });
    console.log('   ✅ Delete Test: Successful');
    
    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`   📦 Collections: ${collections.length} found`);
    collections.forEach(col => {
      console.log(`      - ${col.name}`);
    });
    
    mongoCheckPassed = true;
    
  } catch (error) {
    console.error('   ❌ MongoDB Connection Failed:', error.message);
    console.log('');
    console.log('   💡 Troubleshooting Tips:');
    console.log('      1. Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for testing)');
    console.log('      2. Verify MONGODB_URI in .env file');
    console.log('      3. Ensure database user has correct permissions');
    console.log('      4. Check if MongoDB Atlas cluster is active');
    console.log('      5. Try local MongoDB: mongodb://localhost:27017/prepforge');
  } finally {
    await mongoose.disconnect();
  }
} else {
  console.log('   ❌ MONGODB_URI not configured in .env file');
}

console.log('');
console.log(`   Overall Status: ${mongoCheckPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log('');

// 3. Firebase Configuration Check
console.log('📋 STEP 3: Firebase Configuration');
console.log('─────────────────────────────────────────────────────────────');

const firebaseVars = {
  'FIREBASE_PROJECT_ID': process.env.FIREBASE_PROJECT_ID,
  'FIREBASE_PRIVATE_KEY_ID': process.env.FIREBASE_PRIVATE_KEY_ID,
  'FIREBASE_PRIVATE_KEY': process.env.FIREBASE_PRIVATE_KEY,
  'FIREBASE_CLIENT_EMAIL': process.env.FIREBASE_CLIENT_EMAIL,
  'FIREBASE_CLIENT_ID': process.env.FIREBASE_CLIENT_ID,
};

let firebaseCheckPassed = true;

for (const [key, value] of Object.entries(firebaseVars)) {
  const status = value ? '✅' : '❌';
  const displayValue = value 
    ? (key.includes('KEY')) 
      ? `${value.substring(0, 30)}...` 
      : value
    : 'MISSING';
  
  console.log(`   ${status} ${key.padEnd(30)} ${displayValue}`);
  
  if (!value) {
    firebaseCheckPassed = false;
  }
}

console.log('');
console.log(`   Overall Status: ${firebaseCheckPassed ? '✅ PASSED' : '⚠️  WARNING - Firebase disabled'}`);
console.log('');

// 4. OpenAI Configuration Check
console.log('📋 STEP 4: OpenAI Configuration');
console.log('─────────────────────────────────────────────────────────────');

let openaiCheckPassed = false;

if (process.env.OPENAI_API_KEY) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  console.log(`   ✅ API Key Format: ${apiKey.startsWith('sk-') ? 'Valid' : 'Invalid'}`);
  console.log(`   ✅ API Key Length: ${apiKey.length} characters`);
  console.log(`   ✅ API Key Preview: ${apiKey.substring(0, 30)}...`);
  
  // Test API connection (optional - requires OpenAI package)
  try {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    console.log('   🔌 Testing OpenAI API connection...');
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });
    
    console.log('   ✅ API Connection: Successful');
    console.log(`   ✅ Model: ${response.model}`);
    console.log(`   ✅ Response ID: ${response.id}`);
    
    openaiCheckPassed = true;
  } catch (error) {
    console.error('   ❌ OpenAI API Test Failed:', error.message);
    if (error.message.includes('API key')) {
      console.log('   💡 Tip: Check if the API key is valid and has credits');
    }
  }
} else {
  console.log('   ❌ OPENAI_API_KEY not configured');
}

console.log('');
console.log(`   Overall Status: ${openaiCheckPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log('');

// 5. File System Checks
console.log('📋 STEP 5: File System Structure');
console.log('─────────────────────────────────────────────────────────────');

import { existsSync } from 'fs';

const requiredPaths = [
  '../.env',
  './models',
  './routes',
  './config',
  './services',
  './sockets',
  './middleware',
  './index.js',
];

let fsCheckPassed = true;

for (const path of requiredPaths) {
  const fullPath = resolve(__dirname, path);
  const exists = existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  console.log(`   ${status} ${path}`);
  
  if (!exists) {
    fsCheckPassed = false;
  }
}

console.log('');
console.log(`   Overall Status: ${fsCheckPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log('');

// Final Summary
console.log('═══════════════════════════════════════════════════════════════');
console.log('                    Diagnostics Summary');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const results = [
  { name: 'Environment Variables', status: envCheckPassed },
  { name: 'MongoDB Connection', status: mongoCheckPassed },
  { name: 'Firebase Config', status: firebaseCheckPassed },
  { name: 'OpenAI Integration', status: openaiCheckPassed },
  { name: 'File System', status: fsCheckPassed },
];

results.forEach(result => {
  const icon = result.status ? '✅' : '❌';
  console.log(`   ${icon} ${result.name}`);
});

const allPassed = results.every(r => r.status);

console.log('');
if (allPassed) {
  console.log('   🎉 All systems operational! Backend is ready to run.');
} else {
  console.log('   ⚠️  Some issues detected. Please fix the errors above.');
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

process.exit(allPassed ? 0 : 1);
