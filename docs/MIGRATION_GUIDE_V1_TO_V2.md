# Migration Guide - V1 to V2 System

## Overview

This guide helps you transition from the Phase 1 implementation (semi-static) to the Phase 2 production-grade system (fully dynamic).

---

## Key Differences

### Phase 1 (Old System)
- ❌ Static question pools in `interviewEngineService.js`
- ❌ Pre-built question arrays
- ❌ Hard-coded difficulty levels
- ❌ Basic turn-by-turn evaluation
- ❌ Limited state tracking

### Phase 2 (New System)
- ✅ Dynamic question generation from data
- ✅ QuestionBank model with generation metadata
- ✅ Adaptive difficulty based on performance
- ✅ Multi-metric rule-based evaluation
- ✅ Complete session state management
- ✅ Longitudinal progress tracking
- ✅ Gap classification and closure monitoring

---

## Migration Steps

### Step 1: Database Preparation

**Run MongoDB Index Creation**:
```javascript
// Connect to MongoDB
use prepforge;

// JobDescription indexes
db.jobdescriptions.createIndex({ userId: 1, isActive: 1 });
db.jobdescriptions.createIndex({ jobTitle: "text", "requirements.requiredSkills.technical": "text" });
db.jobdescriptions.createIndex({ "detectedDomain.primary": 1 });

// QuestionBank indexes
db.questionbanks.createIndex({ type: 1, difficulty: 1 });
db.questionbanks.createIndex({ "generationSource.method": 1 });
db.questionbanks.createIndex({ "generationSource.sourceData.skill": 1 });
db.questionbanks.createIndex({ "usageStats.effectiveness": -1 });

// SkillGap indexes
db.skillgaps.createIndex({ userId: 1, status: 1 });
db.skillgaps.createIndex({ severity: 1, status: 1 });
db.skillgaps.createIndex({ skill: 1 });
db.skillgaps.createIndex({ interviewSessionId: 1 });

// InterviewProgress indexes
db.interviewprogresses.createIndex({ userId: 1, targetRole: 1 });
db.interviewprogresses.createIndex({ "currentStatus.readinessLevel": 1 });

// CodingChallenge indexes
db.codingchallenges.createIndex({ difficulty: 1, category: 1 });
db.codingsubmissions.createIndex({ userId: 1, challengeId: 1 });
```

---

### Step 2: Deprecate Old Routes (Optional)

If you want to maintain backward compatibility:

**Keep old routes but mark as deprecated**:
```javascript
// server/routes/conversationalInterview.js
router.post('/start', async (req, res) => {
  console.warn('⚠️ DEPRECATED: Use /api/interview/live/start instead');
  // ... existing logic
});
```

**Or redirect to new routes**:
```javascript
router.post('/start', (req, res) => {
  res.status(301).json({
    deprecated: true,
    message: 'This endpoint is deprecated. Use /api/interview/live/start',
    newEndpoint: '/api/interview/live/start',
  });
});
```

---

### Step 3: Migrate Existing Data

**Migrate ParsedResume documents** (if structure changed):
```javascript
// Migration script: scripts/migrateResumes.js
import mongoose from 'mongoose';
import ParsedResume from '../server/models/ParsedResume.js';

async function migrateResumes() {
  const resumes = await ParsedResume.find({});
  
  for (const resume of resumes) {
    // Ensure skills arrays exist
    if (!resume.skills.cloudPlatforms) {
      resume.skills.cloudPlatforms = [];
    }
    
    await resume.save();
  }
  
  console.log(`Migrated ${resumes.length} resumes`);
}

migrateResumes();
```

**Create InterviewProgress for existing users**:
```javascript
// scripts/createProgressDocs.js
import ConversationalInterview from '../server/models/ConversationalInterview.js';
import InterviewProgress from '../server/models/InterviewProgress.js';

async function createProgressDocs() {
  const completedSessions = await ConversationalInterview.find({ 
    status: 'completed' 
  });
  
  const userSessions = {};
  
  // Group sessions by user and target role
  for (const session of completedSessions) {
    const key = `${session.userId}_${session.context?.targetRole || 'General'}`;
    
    if (!userSessions[key]) {
      userSessions[key] = [];
    }
    
    userSessions[key].push(session);
  }
  
  // Create InterviewProgress documents
  for (const [key, sessions] of Object.entries(userSessions)) {
    const [userId, targetRole] = key.split('_');
    
    const progress = await InterviewProgress.getOrCreate(userId, targetRole);
    
    for (const session of sessions) {
      progress.addSession({
        sessionId: session._id,
        date: session.completedAt || session.createdAt,
        type: session.interviewType,
        overallScore: session.finalEvaluation?.overallScore || 0,
        readinessScore: 0,
        duration: 10,
        questionCount: session.turns.length,
      });
    }
    
    await progress.save();
  }
  
  console.log(`Created progress docs for ${Object.keys(userSessions).length} user-role combinations`);
}

createProgressDocs();
```

---

### Step 4: Update Frontend Integration

**Old API calls**:
```javascript
// OLD (Phase 1)
const response = await fetch('/api/interview/conversational/start', {
  method: 'POST',
  body: JSON.stringify({ userId, resumeId }),
});
```

**New API calls**:
```javascript
// NEW (Phase 2)
const response = await fetch('/api/interview/live/start', {
  method: 'POST',
  body: JSON.stringify({ userId, resumeId, jobDescriptionId }),
});
```

**Update response handling**:
```javascript
// OLD response structure
{
  sessionId: "...",
  firstQuestion: "...",
}

// NEW response structure
{
  success: true,
  data: {
    sessionId: "...",
    question: "...",
    questionId: "...",
    context: { ... },
    state: { ... },
  }
}
```

---

### Step 5: Test New System

**1. Test Question Generation**:
```bash
# Start interview with resume only
curl -X POST http://localhost:5000/api/interview/live/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","resumeId":"RESUME_ID"}'

# Verify question is generated from resume skills
```

**2. Test Adaptive Flow**:
```bash
# Answer poorly
curl -X POST http://localhost:5000/api/interview/live/SESSION_ID/answer \
  -H "Content-Type: application/json" \
  -d '{"answer":"I dont know","timeSpent":10}'

# Check if difficulty decreased
curl http://localhost:5000/api/interview/live/SESSION_ID/status
# Should show difficultyLevel: 'easy' after 2-3 poor answers
```

**3. Test Gap Detection**:
```bash
# Complete interview
# ...

# Check gaps
curl http://localhost:5000/api/interview/gaps/USER_ID

# Verify gaps are detected and classified
```

**4. Test Progress Tracking**:
```bash
# Complete multiple interviews
# ...

# Check progress
curl http://localhost:5000/api/interview/progress/USER_ID/TARGET_ROLE

# Verify trends and improvements are tracked
```

---

### Step 6: Update Environment Variables

**Add to `.env` if needed**:
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4-turbo  # Default model for question generation

# Interview Configuration
MAX_INTERVIEW_TURNS=15
MIN_INTERVIEW_TURNS=5
DEFAULT_DIFFICULTY=medium
```

---

## Backward Compatibility

### Option 1: Dual System (Recommended)

Run both systems side-by-side:
- Old routes: `/api/interview/conversational/*`
- New routes: `/api/interview/live/*`

Users can choose which system to use.

### Option 2: Gradual Migration

1. **Week 1**: Deploy new system alongside old
2. **Week 2**: Migrate 20% of users to new system
3. **Week 3**: Migrate 50% of users
4. **Week 4**: Migrate 80% of users
5. **Week 5**: Migrate all users, deprecate old system

### Option 3: Hard Cutover

1. Deploy new system
2. Update all frontend components
3. Deprecate old routes immediately

---

## Breaking Changes

### API Response Format Changes

**Old**:
```json
{
  "sessionId": "...",
  "question": "..."
}
```

**New**:
```json
{
  "success": true,
  "data": {
    "sessionId": "...",
    "question": "...",
    "questionId": "...",
    "context": { ... },
    "state": { ... }
  }
}
```

**Migration**: Update frontend to access `response.data.question` instead of `response.question`

### Evaluation Format Changes

**Old**:
```json
{
  "overallScore": 75,
  "feedback": "Good answer but could use more detail"
}
```

**New**:
```json
{
  "evaluation": {
    "score": 75,
    "metrics": {
      "clarity": 80,
      "relevance": 75,
      "depth": 65,
      "structure": 85,
      "technicalAccuracy": 70
    },
    "feedback": {
      "strengths": ["Clear communication"],
      "weaknesses": ["Lacks depth"],
      "suggestions": ["Include examples"],
      "scoreBreakdown": { ... }
    }
  }
}
```

**Migration**: Update frontend to display detailed metrics and structured feedback

---

## Performance Considerations

### Question Generation Caching

The new system caches generated questions in QuestionBank:
- **First time**: GPT-4 API call (~2-3 seconds)
- **Subsequent**: Database lookup (~50ms)

**Expected improvement**: After 10-20 interviews, most questions are cached, reducing latency by 95%.

### State Management Overhead

The new system maintains more detailed state:
- **Old system**: ~500 bytes per session
- **New system**: ~2-3 KB per session

**Expected impact**: Negligible for <10K concurrent users

### Database Queries

The new system makes more database calls:
- **Old**: 2-3 queries per turn
- **New**: 5-7 queries per turn (session, question, gaps, progress)

**Mitigation**: Indexes created on all frequently queried fields

---

## Rollback Plan

If issues arise, rollback steps:

1. **Disable new routes**:
```javascript
// server/index.js
// app.use('/api/interview', liveInterviewRoutes); // DISABLED
```

2. **Re-enable old routes**:
```javascript
app.use('/api/interview/conversational', conversationalInterviewRoutes);
```

3. **Update frontend to use old endpoints**

4. **Investigate and fix issues**

5. **Redeploy when ready**

---

## Monitoring

### Key Metrics to Track

1. **Question Generation**:
   - Cache hit rate (target: >80% after 20 interviews)
   - Generation latency (target: <3 seconds)
   - Generation failures (target: <1%)

2. **Evaluation**:
   - Average evaluation time (target: <1 second)
   - Concept extraction success rate (target: >95%)
   - Gap detection rate (target: 20-40% of sessions)

3. **User Experience**:
   - Average interview duration (target: 10-20 minutes)
   - Completion rate (target: >80%)
   - User satisfaction (collect feedback)

4. **System Health**:
   - API response times (target: <500ms)
   - Database query times (target: <100ms)
   - Error rates (target: <0.1%)

### Logging

Add logging to monitor the new system:
```javascript
// In InterviewOrchestrator
console.log('[INTERVIEW] Session started:', { userId, resumeId, targetRole });
console.log('[INTERVIEW] Question selected:', { method: question.generationSource.method, skill });
console.log('[INTERVIEW] Answer evaluated:', { score, gaps: evaluation.gaps.length });
console.log('[INTERVIEW] Session completed:', { totalTurns, finalScore, readiness });
```

---

## Support

### Common Migration Issues

**Issue**: "Question generation too slow"
- **Cause**: No cached questions yet
- **Solution**: Pre-populate QuestionBank with common skills

**Issue**: "Gaps not being detected"
- **Cause**: Expected components not set properly
- **Solution**: Verify QuestionBank documents have expectedComponents

**Issue**: "Progress not showing"
- **Cause**: InterviewProgress documents not created
- **Solution**: Run migration script to create progress docs

**Issue**: "Frontend breaks with new response format"
- **Cause**: Response structure changed
- **Solution**: Update frontend to access `response.data`

---

## Checklist

Before going live with V2:

- [ ] MongoDB indexes created
- [ ] Migration scripts tested
- [ ] Existing data migrated (resumes, sessions, gaps)
- [ ] Frontend updated for new API format
- [ ] Environment variables configured
- [ ] Testing completed (unit, integration, E2E)
- [ ] Monitoring and logging set up
- [ ] Rollback plan tested
- [ ] Documentation reviewed
- [ ] Team trained on new system

---

## Timeline

**Recommended migration timeline**:

- **Day 1**: Deploy V2 alongside V1 (dual system)
- **Day 2-3**: Internal testing of V2
- **Day 4-5**: Beta testing with 10-20 users
- **Day 6-7**: Gradual rollout to 50% of users
- **Day 8**: Full rollout to all users
- **Day 9-10**: Monitor and address issues
- **Day 11+**: Deprecate V1 routes

---

## Success Criteria

V2 migration is successful when:

1. ✅ 95%+ of interviews use V2 system
2. ✅ Question cache hit rate >80%
3. ✅ Evaluation accuracy maintained or improved
4. ✅ User satisfaction ≥ V1 levels
5. ✅ System reliability >99.5%
6. ✅ No critical bugs reported
7. ✅ Performance meets targets
8. ✅ All team members trained

---

## Conclusion

This migration transforms your interview platform from a prototype to a production-ready system. The new architecture provides:

- **Better user experience** (adaptive, personalized)
- **Better evaluation** (transparent, multi-metric)
- **Better insights** (gaps, progress, recommendations)
- **Better scalability** (state management, caching)
- **Better academic integrity** (explainable, reproducible)

Follow this guide carefully, test thoroughly, and monitor closely for a successful migration.
