# 🔧 PrepForge - Troubleshooting Guide

## Table of Contents
1. [MongoDB Connection Issues](#mongodb-connection-issues)
2. [OpenAI API Key Not Loading](#openai-api-key-not-loading)
3. [Firebase Authentication Errors](#firebase-authentication-errors)
4. [Roadmap Generation Fails](#roadmap-generation-fails)
5. [Mock Interview Issues](#mock-interview-issues)
6. [Anti-Cheat System](#anti-cheat-system)

---

## 🗄️ MongoDB Connection Issues

### Problem: SSL/TLS Error
```
❌ MongoDB Connection Error: F4800000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error
```

### Solution ✅

**Option 1: Update MongoDB Connection String**

1. Open `.env` file
2. Update `MONGODB_URI` with SSL parameters:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/prepforge?retryWrites=true&w=majority&ssl=true&tlsAllowInvalidCertificates=true
```

**Option 2: Check IP Whitelist (MongoDB Atlas)**

1. Go to MongoDB Atlas Dashboard
2. Navigate to **Network Access**
3. Add your IP address or use `0.0.0.0/0` (for development only)
4. Wait 1-2 minutes for changes to propagate

**Option 3: Verify Database User Permissions**

1. Go to **Database Access** in MongoDB Atlas
2. Ensure user has **Read and Write** privileges
3. Check username and password in `.env` match MongoDB user

**Option 4: Use Local MongoDB (Development)**

If Atlas continues to fail:
```bash
# Install MongoDB locally
# Windows: https://www.mongodb.com/try/download/community
# After installation, update .env:

MONGODB_URI=mongodb://localhost:27017/prepforge
```

### Verification
```bash
# Test connection
npm run server

# You should see:
✅ MongoDB Connected Successfully
📍 Database: MongoDB Atlas
```

---

## 🤖 OpenAI API Key Not Loading

### Problem: API Key Shows as MISSING
```bash
node -e "console.log(process.env.OPENAI_API_KEY)"
# Output: undefined
```

### Solution ✅

**Step 1: Verify .env File Location**
```
project-root/
  ├── .env          ← Should be here (root directory)
  ├── server/
  └── src/
```

**Step 2: Check .env File Format**
```env
# ✅ CORRECT FORMAT
OPENAI_API_KEY=sk-proj-diDolrtS3k7G41Hfa...

# ❌ WRONG - No quotes needed
OPENAI_API_KEY="sk-proj-..."

# ❌ WRONG - No spaces
OPENAI_API_KEY = sk-proj-...
```

**Step 3: Restart Server**
```bash
# Environment variables load on server start
# Stop server (Ctrl+C) and restart:
npm run dev
```

**Step 4: Verify in Server Logs**
```bash
# Should show:
🔍 Environment Configuration Check:
   OPENAI_API_KEY: ✅ Configured (sk-proj-diDolrtS3k7G...)
```

**Step 5: Test Direct Loading**
```bash
# In project root:
node -r dotenv/config -e "console.log('OpenAI Key:', process.env.OPENAI_API_KEY ? 'Found (' + process.env.OPENAI_API_KEY.substring(0, 20) + '...)' : 'MISSING')"

# Should output:
# OpenAI Key: Found (sk-proj-diDolrtS3k7...)
```

### Get a New API Key
1. Visit https://platform.openai.com/api-keys
2. Click **Create new secret key**
3. Copy the key (starts with `sk-proj-...`)
4. Paste into `.env` file

---

## 🔥 Firebase Authentication Errors

### Problem: Invalid Firebase Token Format
```
Firebase auth failed, trying JWT: Invalid Firebase token format.
```

### Solution ✅

**Step 1: Check Firebase Configuration**

Verify `FIREBASE_PRIVATE_KEY` in `.env`:
```env
# ✅ CORRECT - Keep newlines as \n
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...\n-----END PRIVATE KEY-----\n"

# ❌ WRONG - Actual line breaks will break the system
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkq...
-----END PRIVATE KEY-----"
```

**Step 2: Verify All Firebase Variables**
```env
FIREBASE_PROJECT_ID=prepforge-interview-platform
FIREBASE_PRIVATE_KEY_ID=8ca50b3b9f0b5c351d89c0fc...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@prepforge-interview-platform.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=116217034079191235264
```

**Step 3: Get Fresh Firebase Credentials**
1. Go to Firebase Console
2. Project Settings → Service Accounts
3. Click **Generate New Private Key**
4. Extract values from downloaded JSON:
```json
{
  "project_id": "prepforge-interview-platform",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "..."
}
```

**Step 4: Client-Side Firebase Config**

Check `VITE_FIREBASE_*` variables in `.env`:
```env
VITE_FIREBASE_API_KEY=AIzaSyDzr36ee2i2-rUHkJsxCDX9kIJyIDb3zZE
VITE_FIREBASE_AUTH_DOMAIN=prepforge-interview-platform.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=prepforge-interview-platform
```

---

## 🗺️ Roadmap Generation Fails

### Problem: 404 Error When Loading Roadmap
```javascript
Error: No active roadmap found
```

### Solution ✅

**This is NORMAL** if user hasn't created a roadmap yet!

**Step 1: Create First Roadmap**
1. Go to Roadmap page
2. Fill out the form:
   - Target Role (e.g., "Frontend Developer")
   - Target Date (future date)
   - Weekly Hours (1-70)
   - Experience Level
   - Focus Areas
3. Click "Generate Roadmap"

**Step 2: If Generation Fails**

Check server logs for specific error:
```bash
# Look for:
Error generating roadmap: [specific error message]
```

Common causes:
- **OpenAI API Key Invalid**: Check API key and billing
- **MongoDB Not Connected**: Fix MongoDB connection first
- **Rate Limit**: OpenAI free tier has limits

**Step 3: Verify OpenAI API Status**
```bash
# Test OpenAI connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Step 4: Check OpenAI Billing**
1. Visit https://platform.openai.com/account/billing
2. Ensure you have credits available
3. Add payment method if needed

### Error: "You already have an active roadmap"
```javascript
{
  "message": "You already have an active roadmap. Please complete or pause it first."
}
```

**Solution:**
1. Complete current roadmap by finishing all days
2. OR manually update roadmap status in MongoDB:
```javascript
// In MongoDB Compass or Shell:
db.smartroadmaps.updateOne(
  { userId: ObjectId("YOUR_USER_ID"), status: "active" },
  { $set: { status: "completed" } }
)
```

---

## 🎤 Mock Interview Issues

### Problem: Interview Not Starting
- Questions not loading
- Timer not working
- UI frozen

### Solution ✅

**Step 1: Check Console for Errors**
```bash
# Press F12 → Console tab
# Look for JavaScript errors
```

**Step 2: Clear Browser Cache**
```bash
# Chrome/Edge: Ctrl+Shift+Delete
# Select: Cached images and files
# Time range: All time
```

**Step 3: Verify API Connection**
```javascript
// In browser console:
fetch('http://localhost:5000/api/auth/me')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)

// Should return user data or 401 Unauthorized
```

**Step 4: Restart Development Servers**
```bash
# Stop all processes (Ctrl+C)
npm run dev
```

---

## 🛡️ Anti-Cheat System

### Understanding Anti-Cheat Warnings

#### Warning 1: Tab Switching
```
⚠️ Warning: Tab switching detected!
```
**Triggered when:**
- User switches browser tabs
- User minimizes window
- User Alt+Tabs to another application

**Impact:**
- First warning: Logged
- Second warning: Flagged
- Third+ warning: Marked as suspicious activity

**How to Avoid:**
- Stay focused on interview tab
- Close other applications
- Use single monitor if possible

---

#### Warning 2: Developer Tools
```
🚫 Developer tools detected! This is not allowed during interviews.
```
**Triggered when:**
- User presses F12
- User opens DevTools (Ctrl+Shift+I)
- Browser extension opens inspection tools

**Impact:**
- Immediately marked as suspicious
- May invalidate interview results

**How to Avoid:**
- Close all developer tools before starting
- Don't use debugging shortcuts

---

#### Warning 3: Copy/Paste Blocked
```
⚠️ Copy is disabled during the interview
⚠️ Paste is disabled during the interview
```
**Triggered when:**
- User tries to copy text (Ctrl+C)
- User tries to paste (Ctrl+V)
- User tries to cut (Ctrl+X)

**Exceptions:**
- Paste IS allowed in code editor areas
- Typing your own code is always allowed

**How to Avoid:**
- Type answers manually
- Don't try to copy from external sources

---

#### Warning 4: Right-Click Disabled
```
⚠️ Right-click is disabled during the interview
```
**Triggered when:**
- User right-clicks anywhere on page

**How to Avoid:**
- Use keyboard navigation
- Use provided UI buttons

---

### Viewing Violation Log

During an active interview, click the eye icon (👁️) to see:
```
🚨 Violation Log
-----------------
• TAB_SWITCH     11:23:45 AM
• COPY_ATTEMPT   11:24:12 AM
• TAB_SWITCH     11:25:03 AM
```

### Violation Impact on Results

```javascript
Final Interview Report:
{
  score: 85,
  violations: {
    tabSwitches: 2,
    devToolsDetected: 0,
    copyAttempts: 1,
    suspiciousActivity: false  // ✅ Under 3 tab switches
  }
}
```

**Scoring Impact:**
- 0 violations: Full score
- 1-2 minor violations: Warning only
- 3+ tab switches: Flagged as suspicious
- DevTools detected: Interview may be invalidated

---

### Disabling Anti-Cheat (Development Only)

For testing purposes, modify [`MockInterview.jsx`](src/pages/MockInterview.jsx):

```javascript
// Change this line:
const antiCheat = useAntiCheat({
  onViolation: (violation) => {
    console.warn('🚨 Cheating attempt detected:', violation);
  },
  enableExtensionDetection: false,  // ← Set to false
});

// Then disable monitoring:
// Comment out this line in startRound():
// antiCheat.startMonitoring();
```

**⚠️ WARNING:** Only disable for development. Re-enable for production!

---

## 🔄 General Troubleshooting Steps

### 1. Check All Services Running

```bash
# Terminal should show both:
[0] 🚀 Server running on port 5000
[1] ➜  Local:   http://localhost:3000/
```

### 2. Verify Port Availability

```bash
# Windows
netstat -ano | findstr :5000
netstat -ano | findstr :3000

# If ports are in use, kill processes:
taskkill /PID [PID_NUMBER] /F
```

### 3. Clear All Caches

```bash
# Delete node_modules and reinstall
rm -rf node_modules
rm package-lock.json
npm install

# Clear browser cache
# Ctrl+Shift+Delete → Clear all
```

### 4. Check Environment Variables

```bash
# Create test script: test-env.js
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env') });

console.log('Environment Check:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing');

# Run it:
node test-env.js
```

### 5. Logs Location

```bash
# Server logs: Terminal running `npm run server`
# Client logs: Browser DevTools → Console (F12)
# Network logs: Browser DevTools → Network tab
```

---

## 📞 Getting Help

If you're still experiencing issues:

1. **Check GitHub Issues**: [github.com/Sathvik2005/Prepforge/issues](https://github.com/Sathvik2005/Prepforge/issues)
2. **Review Documentation**: 
   - [README.md](README.md)
   - [DEV_SETUP.md](DEV_SETUP.md)
   - [ARCHITECTURE_AND_DATA_FLOW.md](ARCHITECTURE_AND_DATA_FLOW.md)
3. **Enable Debug Logging**:
```env
# In .env
NODE_ENV=development
DEBUG=*
```

4. **Collect Error Information**:
   - Full error message
   - Browser console logs
   - Server terminal output
   - Steps to reproduce

---

**Last Updated:** January 31, 2026  
**Version:** 2.0.0
