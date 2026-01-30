# Quick Start Guide - Real-Time Interview System

## Prerequisites

Ensure MongoDB is running and you have:
- Resume uploaded → `ParsedResume` document exists
- (Optional) Job description → `JobDescription` document exists
- User ID

---

## API Usage Examples

### 1. Start an Interview

```javascript
POST /api/interview/live/start

Request Body:
{
  "userId": "6507f1f45e93572f...",
  "resumeId": "6507f2345e93572f...",
  "jobDescriptionId": "6507f3456e93572f..." // Optional
}

Response:
{
  "success": true,
  "data": {
    "sessionId": "6507f4567e93572f...",
    "question": "Can you explain how React hooks work and when you would use useState vs useReducer?",
    "questionId": "6507f5678e93572f...",
    "context": {
      "targetRole": "Frontend Developer",
      "candidateSkills": ["React", "JavaScript", "TypeScript", "Redux"],
      "requiredSkills": ["React", "TypeScript", "REST APIs"],
      "identifiedGaps": []
    },
    "state": {
      "currentTurn": 1,
      "topicsCovered": [],
      "skillsProbed": [],
      "difficultyLevel": "medium",
      "confidenceEstimate": 50,
      "strugglingAreas": [],
      "strongAreas": []
    }
  }
}
```

---

### 2. Submit Answer

```javascript
POST /api/interview/live/:sessionId/answer

Request Body:
{
  "answer": "React hooks are functions that let you use state and lifecycle features in functional components. useState is for simple state management, while useReducer is better for complex state logic with multiple sub-values. For example, useState works well for a toggle button, but useReducer is better for managing a form with validation.",
  "timeSpent": 120 // seconds
}

Response (Continue):
{
  "success": true,
  "data": {
    "evaluation": {
      "score": 78,
      "feedback": {
        "strengths": [
          "Clear explanation of approach",
          "Provided concrete examples"
        ],
        "weaknesses": [
          "Could include more detail about when useReducer outperforms useState"
        ],
        "suggestions": [
          "Discuss trade-offs and performance implications"
        ],
        "scoreBreakdown": {
          "clarity": "85/100",
          "relevance": "80/100",
          "depth": "70/100",
          "structure": "85/100",
          "technicalAccuracy": "75/100"
        }
      },
      "metrics": {
        "clarity": 85,
        "relevance": 80,
        "depth": 70,
        "structure": 85,
        "technicalAccuracy": 75
      }
    },
    "nextQuestion": {
      "question": "Can you provide a real-world scenario where useReducer would be a better choice than useState?",
      "questionId": "6507f6789e93572f..."
    },
    "sessionState": {
      "currentTurn": 2,
      "topicsCovered": ["React hooks", "useState", "useReducer"],
      "skillsProbed": ["React"],
      "difficultyLevel": "medium",
      "confidenceEstimate": 78,
      "strugglingAreas": [],
      "strongAreas": ["React"]
    },
    "shouldContinue": true
  }
}

Response (Interview Complete):
{
  "success": true,
  "data": {
    "sessionComplete": true,
    "finalEvaluation": {
      "overallScore": 75,
      "categoryScores": {
        "clarity": 82,
        "relevance": 78,
        "depth": 68,
        "structure": 80,
        "technicalAccuracy": 72
      },
      "identifiedGaps": [
        {
          "skill": "Redux state management",
          "type": "depth-gap",
          "severity": "medium"
        },
        {
          "skill": "Performance optimization",
          "type": "knowledge-gap",
          "severity": "high"
        }
      ],
      "readinessScore": 68,
      "readinessLevel": "interview-ready",
      "recommendations": [
        {
          "area": "Depth of Knowledge",
          "priority": "high",
          "action": "For each skill, prepare 2-3 concrete examples from your experience."
        },
        {
          "area": "Performance optimization",
          "priority": "high",
          "action": "Study Performance optimization fundamentals and build a small project"
        }
      ]
    },
    "totalTurns": 8,
    "duration": 15
  }
}
```

---

### 3. Check Interview Status

```javascript
GET /api/interview/live/:sessionId/status

Response:
{
  "success": true,
  "data": {
    "sessionId": "6507f4567e93572f...",
    "status": "in-progress",
    "currentTurn": 5,
    "topicsCovered": ["React hooks", "useState", "useReducer", "Component lifecycle", "Context API"],
    "skillsProbed": ["React", "JavaScript", "State management"],
    "difficultyLevel": "hard",
    "confidenceEstimate": 82,
    "strugglingAreas": ["Redux"],
    "strongAreas": ["React", "JavaScript"]
  }
}
```

---

### 4. Get Full Transcript

```javascript
GET /api/interview/live/:sessionId/transcript

Response:
{
  "success": true,
  "data": {
    "sessionId": "6507f4567e93572f...",
    "status": "completed",
    "transcript": [
      {
        "turnNumber": 1,
        "question": "Can you explain how React hooks work?",
        "answer": "React hooks are...",
        "evaluation": {
          "score": 78,
          "feedback": { ... }
        },
        "askedAt": "2024-01-15T10:30:00Z"
      },
      // ... more turns
    ],
    "finalEvaluation": { ... }
  }
}
```

---

### 5. View Progress Over Time

```javascript
GET /api/interview/progress/:userId/:targetRole

Response:
{
  "success": true,
  "data": {
    "hasProgress": true,
    "targetRole": "Frontend Developer",
    "totalSessions": 5,
    "totalQuestions": 42,
    "totalMinutes": 87,
    "currentReadiness": {
      "readinessScore": 75,
      "readinessLevel": "interview-ready"
    },
    "currentStatus": {
      "readinessLevel": "interview-ready",
      "openGaps": 3,
      "criticalGaps": 0,
      "confidenceScore": 75
    },
    "scoreTrends": {
      "technical": [
        { "date": "2024-01-10", "score": 65, "sessionId": "..." },
        { "date": "2024-01-12", "score": 72, "sessionId": "..." },
        { "date": "2024-01-15", "score": 75, "sessionId": "..." }
      ],
      "overall": [ ... ]
    },
    "topicMastery": [
      {
        "topic": "React",
        "attempts": 5,
        "averageScore": 82,
        "trend": "improving",
        "masteryLevel": "advanced",
        "firstScore": 65,
        "latestScore": 85
      },
      // ... more topics
    ],
    "improvement": {
      "overallImprovement": 15.4,
      "fastestImprovingTopic": "React",
      "slowestImprovingTopic": "Redux",
      "mostPracticedTopic": "JavaScript",
      "averageImprovementRate": 3.1
    },
    "recentSessions": [ ... ]
  }
}
```

---

### 6. View All Skill Gaps

```javascript
GET /api/interview/gaps/:userId?status=identified

Response:
{
  "success": true,
  "data": {
    "gaps": [
      {
        "_id": "6507f7890e93572f...",
        "userId": "6507f1f45e93572f...",
        "skill": "Redux state management",
        "gapType": "depth-gap",
        "severity": "medium",
        "evidence": {
          "fromInterview": {
            "asked": true,
            "turnNumbers": [3, 7],
            "averageScore": 55,
            "missedConcepts": ["middleware", "thunks", "selectors"],
            "feedback": "Explained basics but lacks understanding of advanced patterns"
          }
        },
        "recommendation": {
          "priority": 7,
          "action": "study-use-cases",
          "resources": [],
          "estimatedTimeToClose": "2-3 weeks",
          "practiceQuestions": [
            "How do Redux middleware work?",
            "When would you use Redux Thunk vs Redux Saga?"
          ]
        },
        "status": "identified"
      },
      // ... more gaps
    ],
    "grouped": {
      "knowledgeGaps": [ ... ],
      "explanationGaps": [ ... ],
      "depthGaps": [ ... ],
      "other": []
    },
    "stats": {
      "total": 5,
      "critical": 0,
      "high": 2,
      "medium": 2,
      "low": 1,
      "byType": {
        "knowledge": 1,
        "explanation": 1,
        "depth": 2,
        "other": 1
      }
    }
  }
}
```

---

### 7. Update Gap Status

```javascript
PATCH /api/interview/gaps/:gapId/status

Request Body:
{
  "status": "in-progress",
  "progressNote": "Started Redux course, completed middleware section"
}

Response:
{
  "success": true,
  "data": {
    "_id": "6507f7890e93572f...",
    "skill": "Redux state management",
    "status": "in-progress",
    "progressNotes": [
      {
        "date": "2024-01-15T14:30:00Z",
        "note": "Started Redux course, completed middleware section"
      }
    ],
    // ... rest of gap object
  }
}
```

---

## Testing Workflow

### Complete Interview Flow Test

```bash
# 1. Start interview
curl -X POST http://localhost:5000/api/interview/live/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "resumeId": "RESUME_ID_HERE"
  }'

# Save sessionId from response

# 2. Answer first question
curl -X POST http://localhost:5000/api/interview/live/SESSION_ID/answer \
  -H "Content-Type: application/json" \
  -d '{
    "answer": "Your detailed answer here...",
    "timeSpent": 120
  }'

# 3. Check status
curl http://localhost:5000/api/interview/live/SESSION_ID/status

# 4. Continue answering until interview completes

# 5. View progress
curl http://localhost:5000/api/interview/progress/USER_ID/Frontend%20Developer

# 6. View gaps
curl http://localhost:5000/api/interview/gaps/USER_ID
```

---

## Integration with Frontend

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

function useLiveInterview(userId, resumeId, jobDescriptionId) {
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/interview/live/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, resumeId, jobDescriptionId }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSession(data.data);
        setCurrentQuestion(data.data.question);
      }
    } catch (error) {
      console.error('Failed to start interview:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (answer, timeSpent) => {
    if (!session) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/interview/live/${session.sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer, timeSpent }),
      });
      const data = await res.json();
      
      if (data.success) {
        setEvaluation(data.data.evaluation);
        
        if (data.data.shouldContinue) {
          setCurrentQuestion(data.data.nextQuestion.question);
        } else {
          // Interview complete
          return data.data.finalEvaluation;
        }
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    session,
    currentQuestion,
    evaluation,
    loading,
    startInterview,
    submitAnswer,
  };
}

// Usage in component
function LiveInterviewPage() {
  const { 
    session, 
    currentQuestion, 
    evaluation, 
    loading, 
    startInterview, 
    submitAnswer 
  } = useLiveInterview(userId, resumeId, jobDescriptionId);

  const [answer, setAnswer] = useState('');
  const [startTime, setStartTime] = useState(null);

  const handleStart = () => {
    startInterview();
    setStartTime(Date.now());
  };

  const handleSubmit = async () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const result = await submitAnswer(answer, timeSpent);
    
    if (result) {
      // Interview complete, show final evaluation
      console.log('Final Evaluation:', result);
    } else {
      // Next question loaded
      setAnswer('');
      setStartTime(Date.now());
    }
  };

  return (
    <div>
      {!session && (
        <button onClick={handleStart}>Start Interview</button>
      )}
      
      {session && currentQuestion && (
        <div>
          <h2>Question {session.state.currentTurn}</h2>
          <p>{currentQuestion}</p>
          
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer..."
          />
          
          <button onClick={handleSubmit} disabled={loading || !answer}>
            Submit Answer
          </button>
        </div>
      )}
      
      {evaluation && (
        <div>
          <h3>Score: {evaluation.score}/100</h3>
          <ul>
            {evaluation.feedback.strengths.map((s, i) => (
              <li key={i}>✅ {s}</li>
            ))}
            {evaluation.feedback.weaknesses.map((w, i) => (
              <li key={i}>⚠️ {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

## Next Steps

1. **Test the API endpoints** using Postman or curl
2. **Create frontend components** for real-time interview UI
3. **Implement WebSocket** for live state updates (optional enhancement)
4. **Add PDF report generation** for final evaluations
5. **Create analytics dashboards** for progress visualization

---

## Troubleshooting

### Common Issues

**Issue**: "Session not found"
- **Solution**: Ensure sessionId is correct and session hasn't expired

**Issue**: "Resume not found"
- **Solution**: Upload resume first using `/api/interview-prep/upload-resume`

**Issue**: Questions seem random
- **Solution**: This is expected initially. After 2-3 turns, the system adapts based on performance and identified gaps

**Issue**: Low scores despite good answers
- **Solution**: Check if answer includes:
  - Clear structure (intro, body, conclusion)
  - Specific examples
  - Technical terms
  - Trade-offs or comparisons

---

## Support

For issues or questions, refer to:
- [PRODUCTION_SYSTEM_GUIDE.md](./PRODUCTION_SYSTEM_GUIDE.md) - Complete technical documentation
- [SYSTEM_ARCHITECTURE_V2.md](./SYSTEM_ARCHITECTURE_V2.md) - Architecture details
