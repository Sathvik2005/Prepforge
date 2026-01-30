# Production-Grade Interview Platform - System Architecture V2

## CORE ARCHITECTURAL PRINCIPLES

1. **Zero Hard-Coding**: All data from database, user input, or computed logic
2. **Real-Time State Management**: Interview sessions maintain live state
3. **Event-Driven**: Actions trigger state updates and persistence
4. **Rule-Based Evaluation**: All scoring uses transparent formulas
5. **Audit Trail**: Every decision logged for academic defense

## LAYERED ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│ React Components (Real-Time UI)                                 │
│ - ResumeUploadFlow (drag-drop, parsing, scoring display)        │
│ - JDInputFlow (paste JD, extract requirements, show match)      │
│ - InterviewLobby (type selection, context setup, readiness)     │
│ - LiveInterviewSession (question, answer, real-time feedback)   │
│ - SkillGapDashboard (visual gap analysis, recommendations)      │
│ - ProgressAnalytics (charts, trends, history)                   │
│ - InterviewReplay (session review, comparison)                  │
│ - CodingSimulator (editor, test cases, execution)               │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                       API GATEWAY LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│ Express.js Routes (RESTful + WebSocket)                         │
│ /api/resume/*          - Resume operations                      │
│ /api/jd/*              - Job description operations             │
│ /api/interview/*       - Interview session management           │
│ /api/evaluation/*      - Evaluation & scoring                   │
│ /api/coding/*          - Coding challenge operations            │
│ /api/progress/*        - Analytics & tracking                   │
│ /api/reports/*         - Report generation                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│ Service Orchestrators (NO HARD-CODED DATA)                      │
│                                                                  │
│ ResumeService:                                                   │
│   - parseResume(buffer) → structured data                       │
│   - calculateATSScore(resume) → score breakdown                 │
│   - extractSkills(text) → categorized skills array              │
│                                                                  │
│ JDService:                                                       │
│   - parseJobDescription(text) → requirements                    │
│   - matchResumeToJD(resume, jd) → match analysis                │
│   - identifySkillGaps(resume, jd) → gap classification          │
│                                                                  │
│ InterviewOrchestrator:                                           │
│   - initializeSession(userId, type, context) → session          │
│   - selectNextQuestion(session, history) → question             │
│   - evaluateAnswer(question, answer) → evaluation               │
│   - determineFollowUp(evaluation) → boolean + reason            │
│   - updateSessionState(session, turn) → updated session         │
│                                                                  │
│ QuestionGenerationService:                                       │
│   - generateFromSkills(skills, difficulty) → question           │
│   - generateFromGaps(gaps, topic) → targeted question           │
│   - generateFollowUp(answer, issue) → probing question          │
│                                                                  │
│ EvaluationEngine:                                                │
│   - evaluateTechnicalAnswer(q, a) → multi-metric score          │
│   - evaluateBehavioralAnswer(q, a) → STAR analysis              │
│   - evaluateCodingSubmission(code, tests) → correctness + style │
│   - aggregateInterviewScores(turns) → final evaluation          │
│                                                                  │
│ SkillGapAnalyzer:                                                │
│   - analyzeKnowledgeGaps(resume, interview) → knowledge gaps    │
│   - analyzeExplanationGaps(resume, interview) → interview gaps  │
│   - prioritizeGaps(gaps) → ordered improvement list             │
│                                                                  │
│ ProgressTracker:                                                 │
│   - recordAttempt(userId, session) → progress entry             │
│   - calculateTrends(userId) → trend analysis                    │
│   - generateRoadmap(gaps, progress) → personalized plan         │
│                                                                  │
│ ReportGenerator:                                                 │
│   - compileReport(userId, sessionIds) → report data             │
│   - generatePDF(reportData) → PDF buffer                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│ MongoDB Models (Mongoose Schemas)                               │
│                                                                  │
│ User: authentication, profile, preferences                      │
│ ParsedResume: structured resume data, ATS scores                │
│ JobDescription: parsed JD, requirements, metadata               │
│ InterviewSession: state, turns, evaluations, analytics          │
│ QuestionBank: dynamically generated questions (cached)          │
│ SkillGap: identified gaps, evidence, severity                   │
│ InterviewProgress: attempts, scores, trends                     │
│ CodingChallenge: problems, test cases, submissions              │
│ InterviewReport: generated reports, PDF metadata                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│ OpenAI GPT-4: Question phrasing, feedback wording (NOT scoring) │
│ PDF Parser: Extract text from resume files                      │
│ Code Executor: Sandbox for running submitted code (Docker)      │
│ PDF Generator: Create professional reports (PDFKit)             │
└─────────────────────────────────────────────────────────────────┘
```

## DATA FLOW: REAL-TIME INTERVIEW SESSION

```
User Action          → API Call           → Service Logic              → State Update         → Response
────────────────────────────────────────────────────────────────────────────────────────────────────────
Start Interview      POST /interview/start  1. Load resume + JD         Session created       First question
                                            2. Identify skill domains
                                            3. Select starting topic
                                            4. Generate Q1
                                            5. Initialize state

Submit Answer        POST /interview/answer 1. Load session state       Turn added            Evaluation +
                                            2. Evaluate answer          Scores calculated     Next question
                                            3. Detect gaps              State updated
                                            4. Check follow-up trigger
                                            5. Select next Q
                                            6. Update session

Request Follow-up    (automatic trigger)    1. Analyze weak points      Follow-up turn        Probing Q
                                            2. Generate targeted Q
                                            3. Mark as follow-up

Complete Interview   POST /interview/end    1. Aggregate all turns      Final evaluation      Report +
                                            2. Calculate overall        Session completed     Recommendations
                                            3. Identify skill gaps
                                            4. Generate recommendations
```

## EVALUATION PIPELINE (RULE-BASED)

```
Answer Text Input
      ↓
┌─────────────────────────┐
│ Preprocessing           │
│ - Tokenization          │
│ - Lowercasing           │
│ - Stop word removal     │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ Multi-Metric Analysis   │
├─────────────────────────┤
│ 1. Clarity              │
│    - Word count         │
│    - Sentence length    │
│    - Readability score  │
├─────────────────────────┤
│ 2. Relevance            │
│    - Keyword matching   │
│    - Topic coherence    │
│    - Context alignment  │
├─────────────────────────┤
│ 3. Depth                │
│    - Concept coverage   │
│    - Example presence   │
│    - Detail level       │
├─────────────────────────┤
│ 4. Structure            │
│    - Logical flow       │
│    - STAR pattern (HR)  │
│    - Intro-body-conclusion │
├─────────────────────────┤
│ 5. Technical Accuracy   │
│    - Concept detection  │
│    - Trade-off mention  │
│    - Use case awareness │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ Weighted Aggregation    │
│ Score = Σ(metric × w)   │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ Gap Detection           │
│ - Missing concepts      │
│ - Weak explanations     │
│ - Vague reasoning       │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ Feedback Generation     │
│ - Score breakdown       │
│ - Specific improvements │
│ - Example comparisons   │
└─────────────────────────┘
```

## STATE MANAGEMENT (INTERVIEW SESSION)

```javascript
InterviewSession {
  sessionId: UUID
  userId: ObjectId
  status: enum [initialized, active, paused, completed]
  
  context: {
    resumeId: ObjectId
    jobDescriptionId: ObjectId
    targetRole: String (from JD)
    candidateSkills: [String] (from resume)
    requiredSkills: [String] (from JD)
    interviewType: enum [hr, technical, coding, mixed]
  }
  
  state: {
    currentTurn: Number
    topicsCovered: [String]
    skillsProbed: [String]
    difficultyLevel: enum [entry, mid, senior]
    confidenceEstimate: Number (0-100)
    strugglingAreas: [String]
    strongAreas: [String]
  }
  
  turns: [{
    turnNumber: Number
    question: {
      text: String
      type: String
      topic: String
      difficulty: String
      expectedConcepts: [String]
      generatedFrom: enum [skill, gap, follow-up]
      parentTurn: Number (if follow-up)
    }
    answer: {
      text: String
      submittedAt: Date
      timeSpent: Number (seconds)
      wordCount: Number
    }
    evaluation: {
      metrics: {
        clarity: Number (0-100)
        relevance: Number (0-100)
        depth: Number (0-100)
        structure: Number (0-100)
        technicalAccuracy: Number (0-100)
      }
      overallScore: Number (0-100)
      detectedConcepts: [String]
      missedConcepts: [String]
      gaps: [{
        type: enum [knowledge, explanation, depth]
        concept: String
        severity: enum [high, medium, low]
        evidence: String
      }]
      feedback: String
      needsFollowUp: Boolean
      followUpReason: String
    }
  }]
  
  finalEvaluation: {
    overallScore: Number
    categoryScores: {
      technicalKnowledge: Number
      communication: Number
      problemSolving: Number
      depth: Number
    }
    identifiedGaps: [SkillGap]
    readinessScore: Number
    recommendations: [String]
  }
  
  analytics: {
    totalTurns: Number
    followUpCount: Number
    averageScore: Number
    averageResponseTime: Number
    topicDistribution: Object
  }
}
```

## DYNAMIC QUESTION GENERATION STRATEGY

NO hard-coded questions. Questions generated from:

1. **Skill-Based Generation**
   - Extract skills from resume
   - For each skill, generate concept verification questions
   - Use GPT-4 for phrasing, NOT content

2. **Gap-Based Generation**
   - Identify weak areas from previous answers
   - Generate targeted questions to probe deeper
   - Focus on missed concepts

3. **Follow-Up Generation**
   - Detect shallow/vague answers
   - Generate "Can you explain..." or "Can you provide an example..." questions
   - Reference specific weakness

4. **JD-Aligned Generation**
   - Parse required skills from job description
   - Generate questions testing those specific skills
   - Prioritize missing skills from resume

## EVALUATION FORMULA TRANSPARENCY

All evaluations use documented formulas:

```
Turn Score = (
  clarity × 0.20 +
  relevance × 0.25 +
  depth × 0.25 +
  structure × 0.15 +
  technicalAccuracy × 0.15
)

where:
  clarity = f(wordCount, sentenceLength, readability)
  relevance = (detectedConcepts ∩ expectedConcepts) / expectedConcepts
  depth = hasExample + hasTradeOff + hasUseCase + detailLevel
  structure = hasIntro + logicalFlow + hasConclusion
  technicalAccuracy = correctConcepts / totalConcepts
```

## REAL-TIME REQUIREMENTS

1. **WebSocket for Live Interviews**
   - Bidirectional communication
   - Real-time evaluation feedback
   - Progress indicators

2. **State Persistence**
   - Every turn auto-saved
   - Session resumable
   - Crash recovery

3. **Progressive Enhancement**
   - Works without JS (basic)
   - Enhanced with real-time features

## ACADEMIC DEFENSE STRATEGY

1. **Explainability**: Every score has component breakdown
2. **Reproducibility**: Same input → same output
3. **Auditability**: All decisions logged
4. **Transparency**: Formulas documented
5. **Ethical AI**: AI only for language, not decisions

This architecture ensures the system is production-ready, academically defensible, and truly simulates real recruitment processes.
