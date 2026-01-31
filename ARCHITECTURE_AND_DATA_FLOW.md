# PrepForge - System Architecture & Data Flow

## 📋 Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Component Architecture](#component-architecture)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Database Schema](#database-schema)
5. [API Architecture](#api-architecture)
6. [Security Architecture](#security-architecture)

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER (Frontend)                         │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   React 18   │  │  Vite (Dev)  │  │   Zustand    │  │ Socket.IO   │ │
│  │  Components  │  │   Server     │  │ State Mgmt   │  │   Client    │ │
│  └──────┬───────┘  └──────────────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                                    │                 │         │
└─────────┼────────────────────────────────────┼─────────────────┼─────────┘
          │                                    │                 │
          │ HTTP/REST                          │ WebSocket       │
          ▼                                    ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER (Backend)                       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │                   Express.js Server                       │           │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │           │
│  │  │  REST API  │  │ Socket.IO  │  │   Middleware       │  │           │
│  │  │  Routes    │  │  Handlers  │  │   - Auth           │  │           │
│  │  │            │  │            │  │   - Validation     │  │           │
│  │  └────┬───────┘  └─────┬──────┘  │   - Error Handler  │  │           │
│  └───────┼────────────────┼─────────┴────────────────────┘  │           │
│          │                │                                              │
│  ┌───────▼────────────────▼──────────────────────────────┐              │
│  │              Business Logic Layer                      │              │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │              │
│  │  │   Services   │  │  Controllers │  │   Models    │ │              │
│  │  │  - Resume    │  │  - User      │  │  - Mongoose │ │              │
│  │  │  - AI        │  │  - Interview │  │   Schemas   │ │              │
│  │  │  - Interview │  │  - Analytics │  │             │ │              │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │              │
│  └────────────────────────────────────────────────────────              │
└─────────┬────────────────────────────────────┬────────────────────────────┘
          │                                    │
          ▼                                    ▼
┌─────────────────────────┐    ┌──────────────────────────────────────────┐
│   EXTERNAL SERVICES     │    │        DATABASE LAYER                    │
│                         │    │                                          │
│ ┌─────────────────────┐ │    │  ┌─────────────────────────────────┐   │
│ │  OpenAI GPT-4       │ │    │  │      MongoDB Atlas              │   │
│ │  - Roadmap Gen      │ │    │  │  ┌──────────────────────────┐   │   │
│ │  - Interview AI     │ │    │  │  │   Collections:           │   │   │
│ │  - Feedback Gen     │ │    │  │  │  - users                 │   │   │
│ └─────────────────────┘ │    │  │  │  - parsedResumes         │   │   │
│                         │    │  │  │  - smartRoadmaps         │   │   │
│ ┌─────────────────────┐ │    │  │  │  - conversationalIntvs   │   │   │
│ │  Firebase Admin     │ │    │  │  │  - skillGaps             │   │   │
│ │  - Authentication   │ │    │  │  │  - interviews            │   │   │
│ │  - User Management  │ │    │  │  │  - questions             │   │   │
│ └─────────────────────┘ │    │  │  │  - media (videos)        │   │   │
│                         │    │  │  └──────────────────────────┘   │   │
│ ┌─────────────────────┐ │    │  └─────────────────────────────────┘   │
│ │  Firebase Storage   │ │    │                                          │
│ │  - Resume Files     │ │    └──────────────────────────────────────────┘
│ │  - Video Recordings │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

---

## 🧩 Component Architecture

### Frontend Component Hierarchy

```
App.jsx
│
├── Layout/
│   ├── Navbar.jsx
│   ├── Sidebar.jsx
│   └── Footer.jsx
│
├── Pages/
│   ├── Dashboard.jsx
│   │   ├── StatsCards.jsx
│   │   ├── ProgressChart.jsx
│   │   └── RecentActivity.jsx
│   │
│   ├── Roadmap.jsx
│   │   ├── RoadmapForm.jsx
│   │   ├── Timeline.jsx
│   │   └── DailyPlanCard.jsx
│   │
│   ├── MockInterview.jsx ⚡ NEW: Anti-Cheat Enabled
│   │   ├── RoundSelector.jsx
│   │   ├── QuestionDisplay.jsx
│   │   ├── AntiCheatMonitor.jsx 🛡️
│   │   └── ResultsPanel.jsx
│   │
│   ├── ResumeBuilder.jsx
│   │   ├── ResumeForm.jsx
│   │   ├── ATSScoreDisplay.jsx
│   │   └── SkillMatcher.jsx
│   │
│   └── Analytics.jsx
│       ├── PerformanceCharts.jsx
│       ├── SkillRadar.jsx
│       └── GrowthTimeline.jsx
│
├── Hooks/
│   ├── useAuth.js
│   ├── useInterview.js
│   └── useAntiCheat.js ⚡ NEW: Tab switching, extension detection
│
└── Services/
    ├── api.js (Axios instance)
    ├── socket.js (Socket.IO client)
    └── firebase.js (Firebase client)
```

### Backend Service Architecture

```
server/
│
├── index.js (Express + Socket.IO setup)
│
├── config/
│   ├── db.js (MongoDB connection)
│   ├── firebase.js ⚡ FIXED: Proper initialization
│   └── openai.js ⚡ FIXED: Environment variable loading
│
├── middleware/
│   ├── auth.js (JWT + Firebase Auth)
│   └── validation.js
│
├── models/
│   ├── User.js
│   ├── ParsedResume.js
│   ├── SmartRoadmap.js
│   ├── ConversationalInterview.js
│   ├── SkillGap.js
│   ├── Question.js
│   └── Media.js
│
├── routes/
│   ├── auth.js
│   ├── resume.js
│   ├── ai.js ⚡ FIXED: Better error handling
│   ├── interviews.js
│   ├── conversationalInterview.js
│   ├── liveInterview.js
│   └── analytics.js
│
├── services/
│   ├── resumeFormatDetector.js
│   ├── resumeVersionManager.js
│   ├── semanticSkillMatcher.js
│   ├── dynamicATSScorer.js
│   ├── roadmapGenerator.js
│   ├── aiServices.js
│   └── questionRecommendation.js
│
└── sockets/
    ├── collaborationHandlers.js
    ├── interviewHandlers.js
    └── interviewSocket.js
```

---

## 🔄 Data Flow Diagrams

### 1. User Authentication Flow

```
┌─────────┐                                                    ┌──────────┐
│ Client  │                                                    │ Firebase │
└────┬────┘                                                    └────┬─────┘
     │                                                              │
     │ 1. Login Request (email, password)                          │
     │─────────────────────────────────────────────────────────────▶
     │                                                              │
     │                      2. Verify Credentials                  │
     │                      3. Generate Firebase Token             │
     │◀─────────────────────────────────────────────────────────────│
     │                                                              │
     │ 4. Send Firebase Token to Backend                           │
     │──────────────────────────────▶┌──────────┐                  │
     │                                │  Backend │                  │
     │                                └────┬─────┘                  │
     │                                     │                        │
     │                         5. Verify Token with Firebase       │
     │                                     │────────────────────────▶
     │                                     │                        │
     │                         6. Token Valid                       │
     │                                     │◀───────────────────────│
     │                                     │                        │
     │                         7. Create Session (JWT)              │
     │                                     │                        │
     │ 8. Return JWT + User Data          │                        │
     │◀───────────────────────────────────│                        │
     │                                                              │
     │ 9. Store JWT in LocalStorage                                │
     │                                                              │
     └─────────────────────────────────────────────────────────────┘
```

### 2. Resume Upload & Analysis Flow

```
┌────────┐                                                      ┌──────────┐
│ Client │                                                      │ Backend  │
└───┬────┘                                                      └────┬─────┘
    │                                                                │
    │ 1. Upload Resume (PDF/DOCX)                                   │
    │───────────────────────────────────────────────────────────────▶
    │                                                                │
    │                            2. resumeFormatDetector.js          │
    │                               - Detect format (PDF/DOCX/JSON)  │
    │                               - Binary analysis                │
    │                               - Confidence scoring             │
    │                                                                │
    │                            3. Parse Resume Content             │
    │                               - Extract sections               │
    │                               - Parse experience               │
    │                               - Extract skills                 │
    │                                                                │
    │                            4. semanticSkillMatcher.js          │
    │                               - Match skills to ontology       │
    │                               - Calculate proficiency          │
    │                               - Find skill gaps                │
    │                                                                │
    │                            5. dynamicATSScorer.js              │
    │                               - Role-specific scoring          │
    │                               - Keyword matching               │
    │                               - Achievement detection          │
    │                                                                │
    │                            6. Save to MongoDB                  │
    │                               ParsedResume Collection          │
    │                                                                │
    │ 7. Return Analysis Results                                    │
    │◀───────────────────────────────────────────────────────────────│
    │   {                                                            │
    │     atsScore: 87,                                              │
    │     skillMatches: [...],                                       │
    │     skillGaps: [...],                                          │
    │     recommendations: [...]                                     │
    │   }                                                            │
    │                                                                │
    └────────────────────────────────────────────────────────────────┘
```

### 3. AI Roadmap Generation Flow

```
┌────────┐                                                      ┌──────────┐
│ Client │                                                      │ Backend  │
└───┬────┘                                                      └────┬─────┘
    │                                                                │
    │ 1. Submit Roadmap Request                                     │
    │    {                                                           │
    │      targetRole: "Frontend Developer",                        │
    │      targetDate: "2025-06-01",                                │
    │      weeklyHours: 20,                                          │
    │      experienceLevel: "intermediate",                         │
    │      focusAreas: ["React", "TypeScript"]                      │
    │    }                                                           │
    │───────────────────────────────────────────────────────────────▶
    │                                                                │
    │                            2. roadmapGenerator.js              │
    │                               - Calculate total days           │
    │                               - Fetch user skill gaps          │
    │                               - Generate prompt for OpenAI     │
    │                                                                │
    │                            3. Call OpenAI API                  │
    │                            ┌──────────────────────────┐        │
    │                            │      OpenAI GPT-4        │        │
    │                            │  - Analyze requirements  │        │
    │                            │  - Generate daily plan   │        │
    │                            │  - Suggest resources     │        │
    │                            │  - Create milestones     │        │
    │                            └──────────────────────────┘        │
    │                                                                │
    │                            4. Parse AI Response                │
    │                               - Structure daily plans          │
    │                               - Assign topics                  │
    │                               - Link questions                 │
    │                                                                │
    │                            5. Save to MongoDB                  │
    │                               SmartRoadmap Collection          │
    │                                                                │
    │ 6. Return Roadmap                                             │
    │◀───────────────────────────────────────────────────────────────│
    │   {                                                            │
    │     roadmap: {                                                 │
    │       dailyPlans: [...]                                        │
    │       milestones: [...]                                        │
    │       totalDays: 120                                           │
    │     }                                                          │
    │   }                                                            │
    │                                                                │
    │ 7. Render Timeline UI                                         │
    │                                                                │
    └────────────────────────────────────────────────────────────────┘
```

### 4. Mock Interview with Anti-Cheat Flow

```
┌────────┐                                                      ┌──────────┐
│ Client │                                                      │ Backend  │
└───┬────┘                                                      └────┬─────┘
    │                                                                │
    │ 1. Start Interview Round                                      │
    │───────────────────────────────────────────────────────────────▶
    │                                                                │
    │ 2. Initialize Anti-Cheat System 🛡️                            │
    │    useAntiCheat.startMonitoring()                             │
    │    - Tab switch detection                                     │
    │    - Extension detection                                      │
    │    - Copy/Paste blocking                                      │
    │    - Right-click blocking                                     │
    │    - DevTools detection                                       │
    │                                                                │
    │ 3. Fetch Questions                                            │
    │───────────────────────────────────────────────────────────────▶
    │                                                                │
    │ 4. Return Questions                                           │
    │◀───────────────────────────────────────────────────────────────│
    │                                                                │
    │ 5. User Switches Tab ⚠️                                        │
    │    document.visibilitychange event                            │
    │    - Increment violation count                                │
    │    - Show warning toast                                       │
    │    - Log violation timestamp                                  │
    │                                                                │
    │ 6. User Opens DevTools ⚠️                                      │
    │    - Detect window size change                                │
    │    - Show critical warning                                    │
    │    - Mark as suspicious activity                              │
    │                                                                │
    │ 7. User Attempts Copy/Paste ⚠️                                 │
    │    - Prevent default action                                   │
    │    - Show warning toast                                       │
    │    - Log violation                                            │
    │                                                                │
    │ 8. Submit Answer                                              │
    │───────────────────────────────────────────────────────────────▶
    │                                                                │
    │ 9. Complete Interview                                         │
    │    - Stop monitoring                                          │
    │    - Generate violation summary                               │
    │    - Send to backend                                          │
    │───────────────────────────────────────────────────────────────▶
    │                                                                │
    │ 10. Store Results with Violation Log                          │
    │                                                                │
    │ 11. Return Feedback + Violation Report                        │
    │◀───────────────────────────────────────────────────────────────│
    │    {                                                           │
    │      score: 85,                                                │
    │      violations: {                                             │
    │        tabSwitches: 2,                                         │
    │        devToolsDetected: 1,                                    │
    │        suspiciousActivity: true                                │
    │      }                                                         │
    │    }                                                           │
    │                                                                │
    └────────────────────────────────────────────────────────────────┘
```

### 5. Real-Time Collaboration Flow (WebSocket)

```
┌──────────┐                                                    ┌──────────┐
│ Client A │                                                    │  Server  │
└────┬─────┘                                                    └────┬─────┘
     │                                                               │
     │ 1. Connect to Socket.IO                                      │
     │──────────────────────────────────────────────────────────────▶
     │                                                               │
     │ 2. Join Room (sessionId)                                     │
     │──────────────────────────────────────────────────────────────▶
     │                                                               │
     │                                            3. Broadcast Join  │
     │                                            ┌──────────┐       │
     │                                            │ Client B │       │
     │                                            └────┬─────┘       │
     │                                                 │             │
     │ 4. User A types code                           │             │
     │    emit('code-change', { code: "..." })        │             │
     │──────────────────────────────────────────────────────────────▶
     │                                                 │             │
     │                         5. Broadcast to room    │             │
     │                                                 │◀────────────│
     │                                                 │             │
     │                         6. User B receives update             │
     │                         update Monaco editor                  │
     │                                                 │             │
     │ 7. User B sends cursor position                │             │
     │                                                 │─────────────▶
     │                                                 │             │
     │ 8. Receive cursor position                     │             │
     │◀───────────────────────────────────────────────────────────────
     │    Show remote cursor in editor                │             │
     │                                                               │
     └───────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### MongoDB Collections

#### 1. **users**
```javascript
{
  _id: ObjectId,
  email: String (unique),
  displayName: String,
  photoURL: String,
  createdAt: Date,
  lastLogin: Date,
  profile: {
    targetRole: String,
    experienceLevel: String,
    skills: [String],
    goals: String
  },
  stats: {
    totalInterviews: Number,
    avgScore: Number,
    streakDays: Number
  }
}
```

#### 2. **parsedResumes**
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  fileName: String,
  fileFormat: String, // 'pdf', 'docx', 'json'
  parsedData: {
    personalInfo: {
      name: String,
      email: String,
      phone: String,
      location: String
    },
    summary: String,
    experience: [{
      company: String,
      position: String,
      duration: String,
      responsibilities: [String],
      achievements: [String]
    }],
    education: [{
      institution: String,
      degree: String,
      year: String
    }],
    skills: [{
      name: String,
      proficiency: String, // 'expert', 'intermediate', 'beginner'
      category: String
    }],
    projects: [{
      name: String,
      description: String,
      technologies: [String]
    }]
  },
  atsScores: {
    overall: Number,
    keywordMatch: Number,
    experienceRelevance: Number,
    skillAlignment: Number,
    achievementQuality: Number
  },
  versionHistory: [{
    versionNumber: Number,
    uploadedAt: Date,
    changes: [String]
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### 3. **smartRoadmaps**
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  goals: {
    targetRole: String,
    targetDate: Date,
    weeklyHours: Number,
    experienceLevel: String,
    focusAreas: [String]
  },
  roadmap: {
    totalDays: Number,
    dailyPlans: [{
      day: Number,
      date: Date,
      topics: [String],
      questionIds: [ObjectId] (ref: 'Question'),
      resources: [String],
      timeEstimate: Number,
      isCompleted: Boolean,
      completedAt: Date
    }],
    milestones: [{
      day: Number,
      title: String,
      description: String,
      isAchieved: Boolean
    }]
  },
  progress: {
    daysCompleted: Number,
    currentDay: Number,
    lastActiveDate: Date,
    completionRate: Number,
    adherenceScore: Number
  },
  status: String, // 'active', 'paused', 'completed'
  createdAt: Date,
  updatedAt: Date
}
```

#### 4. **conversationalInterviews**
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  sessionId: String (unique),
  interviewType: String, // 'technical', 'behavioral', 'coding'
  difficulty: String,
  conversation: [{
    speaker: String, // 'ai' or 'user'
    message: String,
    timestamp: Date,
    questionType: String,
    score: Number
  }],
  evaluation: {
    overall: Number,
    clarity: Number,
    accuracy: Number,
    depth: Number,
    structure: Number,
    relevance: Number
  },
  antiCheatLog: [{ ⚡ NEW
    type: String, // 'TAB_SWITCH', 'DEVTOOLS_OPEN', etc.
    timestamp: Date,
    message: String
  }],
  violationSummary: { ⚡ NEW
    tabSwitches: Number,
    devToolsDetected: Number,
    copyAttempts: Number,
    suspiciousActivity: Boolean
  },
  status: String, // 'in-progress', 'completed', 'abandoned'
  startedAt: Date,
  completedAt: Date
}
```

#### 5. **skillGaps**
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  resumeId: ObjectId (ref: 'ParsedResume'),
  targetRole: String,
  gaps: [{
    skill: String,
    importance: String, // 'critical', 'major', 'minor'
    currentLevel: String,
    requiredLevel: String,
    learningPath: [String],
    estimatedTime: Number,
    resources: [String]
  }],
  progress: [{
    skillId: ObjectId,
    status: String, // 'not-started', 'in-progress', 'completed'
    startedAt: Date,
    completedAt: Date,
    assessmentScore: Number
  }],
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔌 API Architecture

### REST API Endpoints

#### Authentication
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login with Firebase
POST   /api/auth/logout            - Logout user
GET    /api/auth/me                - Get current user
```

#### Resume Management
```
POST   /api/resume/upload          - Upload and parse resume
GET    /api/resume/list            - Get user's resumes
GET    /api/resume/:id             - Get specific resume
POST   /api/resume/analyze         - Analyze resume with ATS
GET    /api/resume/:id/versions    - Get version history
DELETE /api/resume/:id             - Delete resume
```

#### AI Features
```
POST   /api/ai/roadmap/generate    - Generate learning roadmap ⚡ FIXED
GET    /api/ai/roadmap/current     - Get active roadmap ⚡ FIXED
GET    /api/ai/roadmap/today       - Get today's plan
POST   /api/ai/roadmap/complete    - Mark day complete
POST   /api/ai/interview/question  - Generate interview question
POST   /api/ai/interview/feedback  - Get AI feedback
POST   /api/ai/readiness           - Predict interview readiness
```

#### Interviews
```
POST   /api/interviews/start       - Start new interview
GET    /api/interviews/list        - Get user's interviews
GET    /api/interviews/:id         - Get interview details
POST   /api/interviews/:id/answer  - Submit answer
POST   /api/interviews/:id/end     - End interview
POST   /api/interviews/:id/violations ⚡ NEW - Submit violation log
```

#### Skill Gaps
```
GET    /api/skill-gaps/analyze     - Analyze skill gaps
GET    /api/skill-gaps/current     - Get current gaps
POST   /api/skill-gaps/update      - Update gap progress
```

#### Analytics
```
GET    /api/analytics/dashboard    - Get dashboard stats
GET    /api/analytics/progress     - Get learning progress
GET    /api/analytics/skills       - Get skill breakdown
GET    /api/analytics/interviews   - Get interview history
```

### WebSocket Events

#### Collaboration
```
connect                    - Client connects
disconnect                 - Client disconnects
join-session              - Join collaboration session
leave-session             - Leave session
code-change               - Code editor update
cursor-move               - Cursor position update
user-joined               - User joined notification
user-left                 - User left notification
```

#### Interviews
```
interview-start           - Start interview session
interview-question        - New question
interview-answer          - Submit answer
interview-feedback        - Receive feedback
interview-end             - Interview completed
```

---

## 🔒 Security Architecture

### Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│                   Security Layers                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Layer 1: Firebase Authentication                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ - Email/Password                                        │  │
│  │ - OAuth (Google, GitHub)                                │  │
│  │ - Token generation & validation                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                           ▼                                   │
│  Layer 2: JWT Tokens (Fallback)                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ - Session management                                    │  │
│  │ - Token refresh                                         │  │
│  │ - Expiration handling                                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                           ▼                                   │
│  Layer 3: Middleware Validation                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ - Request validation                                    │  │
│  │ - Authorization checks                                  │  │
│  │ - Rate limiting                                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                           ▼                                   │
│  Layer 4: Anti-Cheat System ⚡ NEW                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ - Tab switch detection                                  │  │
│  │ - Browser extension blocking                            │  │
│  │ - DevTools detection                                    │  │
│  │ - Copy/Paste prevention                                 │  │
│  │ - Violation logging                                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Data Security

```
┌──────────────────────────────────────────────────────────────┐
│                   Data Protection                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Encryption in Transit                                     │
│     - HTTPS/TLS for all API calls                            │
│     - WSS (WebSocket Secure) for real-time                   │
│                                                               │
│  2. Encryption at Rest                                        │
│     - MongoDB encryption                                      │
│     - Firebase Storage encryption                            │
│                                                               │
│  3. Environment Variables                                     │
│     - API keys in .env (not committed)                       │
│     - Server-side only secrets                               │
│                                                               │
│  4. Input Validation                                          │
│     - Schema validation with Joi                             │
│     - Sanitization of user input                             │
│     - XSS prevention                                         │
│                                                               │
│  5. CORS Configuration                                        │
│     - Whitelist allowed origins                              │
│     - Credential handling                                    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 📊 Performance Optimization

### Caching Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                   Caching Layers                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Browser Cache                                                │
│  ├── Static assets (images, fonts)                           │
│  ├── Compiled JavaScript bundles                             │
│  └── CSS stylesheets                                         │
│                                                               │
│  Application State (Zustand)                                  │
│  ├── User session data                                       │
│  ├── Active interview data                                   │
│  └── Roadmap progress                                        │
│                                                               │
│  Server-Side Caching                                          │
│  ├── Frequent database queries                               │
│  ├── AI-generated content                                    │
│  └── Skill ontology data                                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   Production Environment                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend: Vercel / Netlify                                   │
│  ├── Static site generation                                  │
│  ├── CDN distribution                                        │
│  └── Automatic HTTPS                                         │
│                                                               │
│  Backend: Railway / Render / AWS                              │
│  ├── Node.js server                                          │
│  ├── Auto-scaling                                            │
│  └── Health monitoring                                       │
│                                                               │
│  Database: MongoDB Atlas                                      │
│  ├── Clustered deployment                                    │
│  ├── Automatic backups                                       │
│  └── Geographic distribution                                 │
│                                                               │
│  Storage: Firebase Storage                                    │
│  ├── Resume files                                            │
│  ├── Video recordings                                        │
│  └── User assets                                             │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## ⚡ Recent Fixes & Improvements

### MongoDB Connection (FIXED ✅)
- Added proper SSL/TLS configuration for Windows
- Disabled certificate validation for development
- Improved retry logic with better error messages

### OpenAI Integration (FIXED ✅)
- Fixed environment variable loading in `server/index.js`
- Added initialization checks and warnings
- Improved error handling in roadmap generation

### Anti-Cheat System (NEW 🛡️)
- Tab switching detection with warnings
- Browser extension detection
- Developer tools blocking
- Copy/Paste prevention
- Right-click menu blocking
- Violation logging and reporting

### Roadmap Generation (IMPROVED ⚡)
- Better error messages with stack traces
- Development mode error details
- Improved validation and logging

---

## 📝 Environment Variables

```bash
# Backend Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://...

# Firebase
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Frontend
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=...
```

---

**Last Updated:** January 31, 2026  
**Version:** 2.0.0 (Anti-Cheat Integration)
