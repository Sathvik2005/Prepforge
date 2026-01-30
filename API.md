# PrepWiser - API Reference

Complete API documentation for all 80+ endpoints.

**Base URL:** `http://localhost:5000/api`

**Authentication:** JWT Bearer Token in Authorization header

---

## Table of Contents

- [Authentication](#authentication)
- [Collaboration](#collaboration)
- [Gamification](#gamification)
- [Resumes](#resumes)
- [Analytics](#analytics)
- [Mock Interviews](#mock-interviews)
- [Jobs](#jobs)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Authentication

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response 201:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response 200:**
```json
{
  "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2024-01-20T10:30:00.000Z"
}
```

---

## Collaboration

### List User Sessions
```http
GET /api/collaboration/sessions
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response 200:**
```json
[
  {
    "_id": "session123",
    "title": "Interview Prep Notes",
    "type": "document",
    "content": "## React Hooks\n- useState...",
    "participants": ["user1", "user2"],
    "activeUsers": ["user1"],
    "createdBy": "user1",
    "isActive": true,
    "createdAt": "2024-01-20T10:00:00.000Z"
  }
]
```

### Create Session
```http
POST /api/collaboration/sessions
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Interview Prep Notes",
  "type": "document",
  "content": "Initial content..."
}
```

**Response 201:**
```json
{
  "_id": "session123",
  "title": "Interview Prep Notes",
  "type": "document",
  "content": "Initial content...",
  "participants": ["user1"],
  "activeUsers": [],
  "createdBy": "user1",
  "isActive": true,
  "createdAt": "2024-01-20T10:00:00.000Z"
}
```

### Update Session
```http
PUT /api/collaboration/sessions/:id
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "content": "Updated content...",
  "title": "Updated Title"
}
```

### Delete Session
```http
DELETE /api/collaboration/sessions/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response 200:**
```json
{
  "message": "Session deleted successfully"
}
```

### Join Session
```http
POST /api/collaboration/sessions/:id/join
Authorization: Bearer YOUR_JWT_TOKEN
```

### Leave Session
```http
POST /api/collaboration/sessions/:id/leave
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get Active Users
```http
GET /api/collaboration/sessions/:id/active-users
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response 200:**
```json
{
  "activeUsers": ["user1", "user2"],
  "count": 2
}
```

---

## Gamification

### Get User Gamification Data
```http
GET /api/gamification
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response 200:**
```json
{
  "user": "user123",
  "points": 1250,
  "level": 11,
  "currentLevelPoints": 1100,
  "nextLevelPoints": 1440,
  "badges": [
    {
      "name": "First Steps",
      "description": "Complete your first practice",
      "icon": "🎯",
      "earnedAt": "2024-01-15T10:00:00.000Z"
    },
    {
      "name": "Centurion",
      "description": "Complete 100 practice questions",
      "icon": "💯",
      "earnedAt": "2024-01-20T15:30:00.000Z"
    }
  ],
  "streak": {
    "current": 7,
    "longest": 15,
    "lastActivity": "2024-01-20T10:00:00.000Z"
  },
  "activeChallenges": [
    {
      "id": "challenge1",
      "title": "Daily Practice",
      "description": "Complete 5 questions today",
      "progress": 3,
      "target": 5,
      "reward": 100
    }
  ],
  "leaderboardRank": 42
}
```

### Award Points
```http
POST /api/gamification/points
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "points": 20,
  "reason": "Correct answer"
}
```

**Response 200:**
```json
{
  "newPoints": 1270,
  "level": 11,
  "badgesEarned": []
}
```

### Get All Badges
```http
GET /api/gamification/badges
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response 200:**
```json
{
  "earned": [
    {
      "name": "First Steps",
      "description": "Complete your first practice",
      "icon": "🎯",
      "earnedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "available": [
    {
      "name": "Perfectionist",
      "description": "Get 10 correct answers in a row",
      "icon": "✨",
      "requirement": "10 consecutive correct answers"
    }
  ]
}
```

### Get Leaderboard
```http
GET /api/gamification/leaderboard?timeframe=weekly&limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `timeframe` (optional): `daily`, `weekly`, `monthly`, `allTime` (default: `weekly`)
- `limit` (optional): Number of users (default: 10, max: 100)

**Response 200:**
```json
{
  "timeframe": "weekly",
  "leaderboard": [
    {
      "rank": 1,
      "user": {
        "_id": "user1",
        "name": "Alice Smith"
      },
      "points": 5420,
      "level": 23,
      "badgeCount": 15
    },
    {
      "rank": 2,
      "user": {
        "_id": "user2",
        "name": "Bob Johnson"
      },
      "points": 4890,
      "level": 22,
      "badgeCount": 12
    }
  ],
  "currentUser": {
    "rank": 42,
    "points": 1250
  }
}
```

### Get Active Challenges
```http
GET /api/gamification/challenges
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response 200:**
```json
[
  {
    "_id": "challenge1",
    "title": "Daily Practice",
    "description": "Complete 5 questions today",
    "type": "daily",
    "target": 5,
    "reward": 100,
    "expiresAt": "2024-01-20T23:59:59.000Z",
    "progress": 3,
    "completed": false
  }
]
```

### Complete Challenge
```http
POST /api/gamification/challenges/:id/complete
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response 200:**
```json
{
  "message": "Challenge completed!",
  "reward": 100,
  "newPoints": 1350
}
```

---

## Resumes

### List User Resumes
```http
GET /api/resumes
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response 200:**
```json
[
  {
    "_id": "resume123",
    "personalInfo": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1-555-123-4567",
      "location": "San Francisco, CA"
    },
    "professionalSummary": "Experienced software developer...",
    "atsScore": 87,
    "targetJobTitle": "Senior React Developer",
    "isPrimary": true,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-20T15:30:00.000Z"
  }
]
```

### Create Resume
```http
POST /api/resumes
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "personalInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-123-4567",
    "location": "San Francisco, CA"
  },
  "experience": [
    {
      "company": "TechCorp",
      "position": "Senior Developer",
      "startDate": "2020-01-01",
      "endDate": "2024-01-01",
      "responsibilities": [
        "Led development of React applications",
        "Mentored junior developers"
      ],
      "achievements": [
        "Improved app performance by 40%"
      ]
    }
  ],
  "education": [
    {
      "institution": "University of Tech",
      "degree": "Bachelor of Science in Computer Science",
      "graduationDate": "2019-05-15",
      "gpa": "3.8"
    }
  ],
  "skills": ["React", "TypeScript", "Node.js", "MongoDB"]
}
```

**Response 201:**
```json
{
  "_id": "resume123",
  "personalInfo": {...},
  "experience": [...],
  "education": [...],
  "skills": [...],
  "atsScore": 0,
  "createdAt": "2024-01-20T10:00:00.000Z"
}
```

### Get Resume
```http
GET /api/resumes/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

### Update Resume
```http
PUT /api/resumes/:id
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "professionalSummary": "Updated summary...",
  "skills": ["React", "TypeScript", "GraphQL"]
}
```

### Delete Resume
```http
DELETE /api/resumes/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

### AI: Enhance Bullet Point
```http
POST /api/resumes/ai/enhance-bullet
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "bullet": "Worked on frontend development"
}
```

**Response 200:**
```json
{
  "original": "Worked on frontend development",
  "enhanced": "Architected and implemented responsive frontend solutions using React and TypeScript, improving user engagement by 40% and reducing page load time by 2 seconds"
}
```

### AI: Generate Professional Summary
```http
POST /api/resumes/ai/generate-summary
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "resume": {
    "experience": [...],
    "skills": [...],
    "targetJobTitle": "Senior React Developer"
  }
}
```

**Response 200:**
```json
{
  "summary": "Results-driven Senior React Developer with 6+ years of experience building scalable web applications. Proven track record of improving application performance by 40% and leading teams of 5+ developers. Expertise in React, TypeScript, Redux, and modern frontend architecture."
}
```

### AI: Optimize for Job
```http
POST /api/resumes/:id/optimize
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "jobDescription": "We're looking for a Senior React Developer with 5+ years of experience in building scalable web applications. Must have expertise in React, TypeScript, Redux, and Node.js. Experience with GraphQL and testing frameworks is a plus."
}
```

**Response 200:**
```json
{
  "originalScore": 72,
  "optimizedScore": 89,
  "optimizedResume": {...},
  "suggestions": [
    "Added React and TypeScript keywords throughout",
    "Emphasized 6 years of experience",
    "Highlighted Redux state management projects",
    "Added GraphQL mention to skills"
  ]
}
```

### Set Primary Resume
```http
POST /api/resumes/:id/set-primary
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Analytics

### Get Dashboard Data
```http
GET /api/analytics/dashboard
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response 200:**
```json
{
  "readiness": {
    "score": 87,
    "passProbability": 92,
    "daysToReadiness": 3,
    "level": "excellent"
  },
  "performanceMetrics": {
    "accuracy": 87.5,
    "avgSpeed": 45,
    "consistency": 0.85,
    "improvementRate": 0.12
  },
  "topicMastery": [
    { "topic": "React", "score": 92 },
    { "topic": "Algorithms", "score": 78 },
    { "topic": "System Design", "score": 65 }
  ],
  "strengths": ["React", "JavaScript", "Frontend"],
  "weaknesses": ["System Design", "Database Design"],
  "studyPatterns": {
    "preferredTime": "evening",
    "mostProductiveDay": "Tuesday",
    "avgSessionLength": 45,
    "studyFrequency": 5
  },
  "recentProgress": [
    { "date": "2024-01-20", "accuracy": 90 },
    { "date": "2024-01-19", "accuracy": 85 }
  ]
}
```

### Get Performance Trends
```http
GET /api/analytics/trends?days=30
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `days` (optional): Number of days (default: 30, max: 365)

**Response 200:**
```json
{
  "trends": [
    {
      "date": "2024-01-20",
      "practiceCount": 15,
      "accuracy": 90,
      "avgTime": 42,
      "topicsStudied": 3
    },
    {
      "date": "2024-01-19",
      "practiceCount": 12,
      "accuracy": 85,
      "avgTime": 48,
      "topicsStudied": 2
    }
  ]
}
```

### Get Predictions
```http
GET /api/analytics/predictions
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response 200:**
```json
{
  "readinessScore": 87,
  "passProbability": 92,
  "daysToReadiness": 3,
  "predictedAccuracy": 91.5,
  "recommendedFocus": ["System Design", "Database Design"],
  "confidenceLevel": 0.85
}
```

### Get Topic Mastery
```http
GET /api/analytics/topic-mastery
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response 200:**
```json
{
  "topics": [
    {
      "name": "React",
      "mastery": 92,
      "practiceCount": 45,
      "accuracy": 94,
      "lastPracticed": "2024-01-20T10:00:00.000Z"
    },
    {
      "name": "Algorithms",
      "mastery": 78,
      "practiceCount": 30,
      "accuracy": 82,
      "lastPracticed": "2024-01-19T15:00:00.000Z"
    }
  ]
}
```

---

## Mock Interviews

### Join Queue
```http
POST /api/mock-interviews/queue/join
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "type": "technical",
  "difficulty": "medium",
  "topics": ["React", "Algorithms"],
  "duration": 60,
  "preferredRole": "interviewer"
}
```

**Response 200 (Instant Match):**
```json
{
  "matched": true,
  "interview": {
    "_id": "interview123",
    "interviewer": "user1",
    "interviewee": "user2",
    "room": "uuid-room-id",
    "scheduledTime": "2024-01-20T10:00:00.000Z",
    "type": "technical",
    "difficulty": "medium"
  }
}
```

**Response 200 (In Queue):**
```json
{
  "matched": false,
  "queuePosition": 3,
  "estimatedWaitTime": 300
}
```

### Leave Queue
```http
POST /api/mock-interviews/queue/leave
Authorization: Bearer YOUR_JWT_TOKEN
```

### Create Interview (Manual Scheduling)
```http
POST /api/mock-interviews/create
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "interviewee": "user2",
  "scheduledTime": "2024-01-21T14:00:00.000Z",
  "type": "technical",
  "difficulty": "hard",
  "topics": ["React", "System Design"],
  "duration": 90
}
```

### Get Upcoming Interviews
```http
GET /api/mock-interviews/upcoming
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response 200:**
```json
[
  {
    "_id": "interview123",
    "interviewer": { "_id": "user1", "name": "Alice" },
    "interviewee": { "_id": "user2", "name": "Bob" },
    "scheduledTime": "2024-01-21T14:00:00.000Z",
    "type": "technical",
    "difficulty": "hard",
    "status": "scheduled"
  }
]
```

### Get Past Interviews
```http
GET /api/mock-interviews/past
Authorization: Bearer YOUR_JWT_TOKEN
```

### Start Interview
```http
POST /api/mock-interviews/:id/start
Authorization: Bearer YOUR_JWT_TOKEN
```

### End Interview
```http
POST /api/mock-interviews/:id/end
Authorization: Bearer YOUR_JWT_TOKEN
```

### Submit Feedback
```http
POST /api/mock-interviews/:id/feedback
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "ratings": {
    "technical": 4,
    "communication": 5,
    "problemSolving": 4,
    "codeQuality": 3,
    "overall": 4
  },
  "strengths": [
    "Clear communication",
    "Strong problem-solving approach"
  ],
  "improvements": [
    "Could optimize code better",
    "Consider edge cases earlier"
  ],
  "comments": "Great interview! Very impressed with the systematic approach."
}
```

### Get User Stats
```http
GET /api/mock-interviews/stats/me
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response 200:**
```json
{
  "totalInterviews": 15,
  "asInterviewer": 8,
  "asInterviewee": 7,
  "avgRating": 4.2,
  "ratings": {
    "technical": 4.3,
    "communication": 4.5,
    "problemSolving": 4.0,
    "codeQuality": 4.1,
    "overall": 4.2
  },
  "strengths": ["Communication", "Problem-solving"],
  "areasToImprove": ["Code optimization"],
  "completionRate": 0.93
}
```

---

## Jobs

### Analyze Job
```http
POST /api/jobs/analyze
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "jobTitle": "Senior React Developer",
  "company": "TechCorp",
  "location": "Remote",
  "jobType": "full-time",
  "experienceLevel": "senior",
  "salary": {
    "min": 120000,
    "max": 180000,
    "currency": "USD"
  },
  "description": "We're looking for a Senior React Developer...",
  "requirements": [
    "5+ years of React experience",
    "Strong TypeScript skills",
    "Experience with Redux"
  ],
  "skills": ["React", "TypeScript", "Redux", "Node.js"]
}
```

**Response 200:**
```json
{
  "_id": "job123",
  "matchScore": 87,
  "skillsMatch": 90,
  "experienceMatch": 95,
  "locationMatch": 100,
  "educationMatch": 100,
  "cultureFit": 75,
  "matchedSkills": ["React", "TypeScript", "Redux"],
  "missingSkills": ["Node.js"],
  "strengths": [
    "Strong React experience aligns perfectly",
    "TypeScript expertise is a major plus"
  ],
  "weaknesses": [
    "Limited Node.js backend experience"
  ],
  "aiInsights": {
    "summary": "Excellent match! Your React expertise and TypeScript skills align perfectly with this role.",
    "applicationTips": [
      "Highlight your 6 years of React experience in your cover letter",
      "Showcase TypeScript projects in your portfolio",
      "Emphasize your state management experience with Redux"
    ],
    "interviewPrep": "Prepare to discuss advanced React patterns, TypeScript best practices, and your approach to state management.",
    "careerGrowth": "Strong potential for growth with modern tech stack and senior-level responsibilities.",
    "estimatedFitScore": 88
  },
  "status": "new",
  "createdAt": "2024-01-20T10:00:00.000Z"
}
```

### Import Jobs (Batch)
```http
POST /api/jobs/import
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "jobs": [
    {
      "jobTitle": "Senior React Developer",
      "company": "TechCorp",
      "skills": ["React", "TypeScript"],
      "externalId": "tc-12345",
      "source": "LinkedIn",
      "url": "https://linkedin.com/jobs/12345"
    },
    {
      "jobTitle": "Full Stack Engineer",
      "company": "StartupXYZ",
      "skills": ["React", "Node.js"]
    }
  ]
}
```

**Response 200:**
```json
{
  "imported": 2,
  "matches": [
    {
      "_id": "job123",
      "jobTitle": "Senior React Developer",
      "matchScore": 87
    },
    {
      "_id": "job456",
      "jobTitle": "Full Stack Engineer",
      "matchScore": 82
    }
  ]
}
```

### Get Recommendations
```http
GET /api/jobs/recommendations?limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `limit` (optional): Number of jobs (default: 10, max: 50)

**Response 200:**
```json
{
  "recommendations": [
    {
      "_id": "job123",
      "jobTitle": "Senior React Developer",
      "company": "TechCorp",
      "matchScore": 87,
      "location": "Remote",
      "salary": { "min": 120000, "max": 180000 },
      "status": "new"
    }
  ]
}
```

### Get Top Matches
```http
GET /api/jobs/top-matches?limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get Saved Jobs
```http
GET /api/jobs/saved
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get Applied Jobs
```http
GET /api/jobs/applied
Authorization: Bearer YOUR_JWT_TOKEN
```

### Save Job
```http
PUT /api/jobs/:id/save
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response 200:**
```json
{
  "message": "Job saved successfully",
  "status": "saved"
}
```

### Mark as Applied
```http
PUT /api/jobs/:id/apply
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "appliedDate": "2024-01-20T10:00:00.000Z"
}
```

### Update Status
```http
PUT /api/jobs/:id/status
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "status": "interviewing"
}
```

**Status Options:** `new`, `viewed`, `saved`, `applied`, `rejected`, `interviewing`, `offered`, `declined`

### Add Notes
```http
PUT /api/jobs/:id/notes
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "notes": "Applied on 01/20. HR screen scheduled for 01/25."
}
```

---

## Error Handling

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": "Validation error",
  "message": "Email is required",
  "code": "VALIDATION_ERROR"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "No token provided",
  "code": "AUTH_REQUIRED"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You don't have permission to access this resource",
  "code": "FORBIDDEN"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Resume not found",
  "code": "NOT_FOUND"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Something went wrong",
  "code": "INTERNAL_ERROR"
}
```

---

## Rate Limiting

**Default Limits:**
- Authentication endpoints: 5 requests per 15 minutes
- AI endpoints (resume enhancement, job insights): 10 requests per hour
- Other endpoints: 100 requests per 15 minutes

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642684800
```

**Rate Limit Exceeded:**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 900
}
```

---

## WebSocket Events (Socket.IO)

### Connection
```javascript
const socket = io('http://localhost:5000');
```

### Collaboration Events
```javascript
// Join session
socket.emit('join-session', { sessionId: 'session123' });

// Content change
socket.emit('content-change', { 
  sessionId: 'session123', 
  content: 'Updated content...' 
});

// Receive updates
socket.on('content-updated', (data) => {
  console.log('Content:', data.content);
});
```

### Mock Interview Events
```javascript
const mockSocket = io('http://localhost:5000/mock-interview');

// Join interview room
mockSocket.emit('join-interview', { interviewId: 'interview123' });

// WebRTC signaling
mockSocket.emit('webrtc-offer', { interviewId, offer });
mockSocket.on('webrtc-answer', ({ answer }) => {
  console.log('Received answer:', answer);
});

// Media controls
mockSocket.emit('toggle-video', { interviewId, enabled: false });
mockSocket.emit('toggle-audio', { interviewId, enabled: true });
```

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10, max: 100)
- `sort` (optional): Field to sort by
- `order` (optional): `asc` or `desc`

**Example:**
```http
GET /api/resumes?page=2&limit=20&sort=createdAt&order=desc
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "currentPage": 2,
    "totalPages": 5,
    "totalItems": 95,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPrevPage": true
  }
}
```

---

## Status Codes

- `200 OK` - Successful GET, PUT, DELETE
- `201 Created` - Successful POST (resource created)
- `204 No Content` - Successful DELETE (no response body)
- `400 Bad Request` - Validation error or malformed request
- `401 Unauthorized` - Authentication required or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate email)
- `422 Unprocessable Entity` - Validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

---

**Version:** 2.0.0

**Last Updated:** January 20, 2024
