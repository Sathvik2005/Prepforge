# 🚀 Development Setup Guide

## Quick Start (Run Both Frontend & Backend Together)

### Option 1: Single Command (Recommended)
```bash
npm run dev
```

This will start:
- ✅ Backend Server → `http://localhost:5000`
- ✅ Frontend Vite Dev Server → `http://localhost:3000`

### Option 2: Separate Terminals

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run client
```

---

## 📋 Environment Setup

### 1. Create `.env` file in root directory

```bash
cp .env.example .env
```

### 2. Configure Essential Variables

**Minimum Required:**
```env
# Backend
PORT=5000
MONGODB_URI=mongodb://localhost:27017/prepforge
JWT_SECRET=your_secret_key_here

# Frontend
VITE_API_URL=http://localhost:5000/api
```

**Full Configuration (with AI features):**
```env
# Backend Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/prepforge
# OR MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/prepforge

# Authentication
JWT_SECRET=generate_random_string_here

# OpenAI (for AI features)
OPENAI_API_KEY=sk-your-key-here

# Frontend API
VITE_API_URL=http://localhost:5000/api

# Firebase (Optional)
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com

VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
```

---

## 🔧 Port Configuration

| Service | Port | URL |
|---------|------|-----|
| Backend API | 5000 | http://localhost:5000 |
| Frontend Dev Server | 3000 | http://localhost:3000 |
| Socket.IO | 5000 | ws://localhost:5000 |

**Important:** Frontend Vite runs on port **3000** (not 5173) as configured in `vite.config.js`

---

## 🔌 API Communication Flow

```
Browser (localhost:3000)
    ↓
Vite Dev Server (Proxy /api → localhost:5000)
    ↓
Express Backend (localhost:5000/api)
    ↓
MongoDB
```

**Proxy Configuration** (already setup in `vite.config.js`):
```javascript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
}
```

---

## 🌐 CORS Configuration

Backend accepts requests from:
- ✅ `http://localhost:3000` (Vite dev server)
- ✅ `http://localhost:5173` (Alternative Vite port)
- ✅ Custom frontend URL (via `FRONTEND_URL` env variable)

**Already configured in `server/index.js`:**
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', process.env.FRONTEND_URL],
  credentials: true,
}));
```

---

## 📡 WebSocket Connection

**Frontend connects to:**
```javascript
const socket = io('http://localhost:5000', {
  withCredentials: true,
});
```

**Namespaces:**
- `/interview` - Real-time interview sessions
- `/collaboration` - Collaborative code editor

---

## ✅ Verification Checklist

After starting `npm run dev`, verify:

### 1. Backend Health Check
```bash
curl http://localhost:5000/api/health
```
Expected: `{"status": "ok", "message": "Server is running"}`

### 2. Frontend Access
Open browser: `http://localhost:3000`

### 3. MongoDB Connection
Check terminal output for:
```
✅ MongoDB Connected Successfully
```

### 4. WebSocket Connection
Open browser console on `localhost:3000` and check for Socket.IO connection logs.

---

## 🐛 Troubleshooting

### Problem: "Cannot connect to backend"
**Solution:**
1. Check backend is running: `npm run server`
2. Verify port 5000 is free: `netstat -ano | findstr :5000`
3. Check `.env` has `VITE_API_URL=http://localhost:5000/api`

### Problem: "CORS error"
**Solution:**
1. Ensure frontend is on port 3000 (not 5173)
2. Check backend CORS configuration includes `http://localhost:3000`
3. Use `credentials: true` in axios/fetch requests

### Problem: "MongoDB connection failed"
**Solution:**
1. Install MongoDB locally: https://www.mongodb.com/try/download/community
2. Start MongoDB service: `net start MongoDB`
3. OR use MongoDB Atlas and update `MONGODB_URI` in `.env`

### Problem: "WebSocket not connecting"
**Solution:**
1. Check backend Socket.IO is initialized (see terminal logs)
2. Verify Socket.IO version matches: `socket.io@4.6.1` & `socket.io-client@4.6.1`
3. Check browser console for connection errors

### Problem: "npm run dev doesn't start both"
**Solution:**
1. Ensure `concurrently` is installed: `npm install concurrently --save-dev`
2. Check `package.json` scripts are correct
3. Try running separately: `npm run server` & `npm run client`

---

## 📦 Package Scripts Reference

```json
{
  "dev": "concurrently \"npm run server\" \"npm run client\"",  // Run both
  "client": "vite",                                             // Frontend only
  "server": "node server/index.js",                             // Backend only
  "build": "vite build",                                        // Production build
  "preview": "vite preview"                                     // Preview build
}
```

---

## 🔄 Development Workflow

1. **Start Development:**
   ```bash
   npm run dev
   ```

2. **Make Changes:**
   - Backend: Edit files in `server/` → Server auto-restarts (if using nodemon)
   - Frontend: Edit files in `src/` → Vite hot-reloads automatically

3. **Test Features:**
   - API testing: Use Postman or `curl`
   - Frontend testing: Browser at `localhost:3000`
   - WebSocket testing: Use Socket.IO client or browser console

4. **View Logs:**
   - Backend logs: Terminal running `npm run server`
   - Frontend logs: Browser DevTools console
   - Network requests: Browser DevTools Network tab

---

## 🚀 Production Deployment

### Build Frontend
```bash
npm run build
```
Output: `dist/` folder

### Serve Static Files (Backend)
Add to `server/index.js`:
```javascript
import path from 'path';

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../dist')));

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});
```

### Environment Variables
```env
NODE_ENV=production
VITE_API_URL=https://yourdomain.com/api
FRONTEND_URL=https://yourdomain.com
```

---

## 📝 Common API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | User login |
| `/api/resume/upload` | POST | Upload resume |
| `/api/interviews/start` | POST | Start interview |
| `/api/interviews/:id/answer` | POST | Submit answer |
| `/api/media/upload` | POST | Upload video answer |

---

## 🎯 Next Steps

1. ✅ Start development server: `npm run dev`
2. ✅ Access frontend: http://localhost:3000
3. ✅ Test API integration: Try login/signup
4. ✅ Test WebSocket: Start mock interview
5. ✅ Upload resume and test parsing
6. ✅ Review logs for any errors

---

**Need Help?**
- Check terminal logs for detailed error messages
- Review `ARCHITECTURE.md` for system design
- See `API.md` for complete endpoint documentation
- Check `FEATURES.md` for feature-specific guides
