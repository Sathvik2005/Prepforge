# PrepForge - AI-Powered Interview Preparation Platform

A comprehensive full-stack application designed to revolutionize technical interview preparation through intelligent automation, real-time feedback, and adaptive learning pathways.

## Overview

PrepForge is an advanced interview preparation system that combines traditional resume analysis with modern AI-powered conversational interviews, live coding assessments, and skill gap detection. The platform addresses critical challenges in technical recruitment by providing candidates with realistic interview simulations and personalized improvement roadmaps.

## Core Problem Statement

Traditional interview preparation tools suffer from several limitations:
- Generic feedback that doesn't account for role-specific requirements
- Binary pass/fail assessment without granular skill analysis
- Limited support for diverse resume formats and international standards
- Lack of transparency in scoring mechanisms
- No historical tracking of improvement over time

PrepForge solves these problems through a systematic, academically rigorous approach that emphasizes transparency, reproducibility, and real-world applicability.

## Key Features

### Resume Intelligence System

**Multi-Format Resume Parser**
The platform automatically detects and processes resumes in multiple international formats including Western standard, Europass, Indian format, and resume builder templates. The parser uses rule-based heuristics to identify format-specific markers such as declaration sections, photo presence, and multi-language headers. When sections fail to parse, the system performs partial extraction rather than complete failure, ensuring maximum data recovery.

**Version Control and Tracking**
Every resume upload creates a new version with complete parent-child relationship tracking. Users can compare versions side-by-side, view ATS score progression over time, and rollback to previous versions. The system calculates improvement rates and identifies which changes led to score increases.

**Dynamic ATS Scoring**
Unlike traditional ATS systems that apply uniform weights regardless of role, PrepForge implements role-specific scoring matrices. Software engineering roles prioritize technical skills and projects (35% and 15% respectively), while product management positions emphasize experience and communication keywords (35% and 20%). The scoring engine uses TF-IDF analysis for keyword matching with diminishing returns to prevent keyword stuffing.

**Quantifiable Achievement Detection**
The system identifies and rewards measurable accomplishments using pattern recognition for percentage improvements, monetary impact, scale metrics, and multiplier effects. Examples include "increased performance by 40%", "saved $2M in operational costs", or "served 1M+ users".

### Semantic Skill Matching

**Skill Ontology Database**
PrepForge maintains a comprehensive skill taxonomy with synonym mappings, hierarchical relationships, and transferability matrices. The system recognizes that "React" and "ReactJS" are identical, understands that Angular and Vue belong to the same frontend framework category with 70% transferability, and can recommend learning paths based on existing related skills.

**Proficiency Level Extraction**
The matching engine extracts proficiency requirements from job descriptions by analyzing contextual clues such as "5+ years of Python experience" or "expert-level knowledge of AWS". This enables more accurate candidate-job alignment beyond simple keyword presence.

**Learning Path Generation**
When skill gaps are identified, the system suggests personalized learning paths with difficulty ratings and time estimates based on transferable skills the candidate already possesses.

### Conversational Interview Engine

**Dynamic Question Generation**
Interview questions are generated dynamically based on resume content, job description requirements, and identified skill gaps. The system uses GPT-4 for natural language generation but relies on deterministic logic for scoring to maintain transparency and auditability.

**Real-Time WebSocket Communication**
Live interviews are conducted through Socket.IO connections enabling real-time question delivery, answer submission with video/audio recording, and immediate feedback. The system includes automatic reconnection handling and state recovery for interrupted sessions.

**Multi-Dimensional Evaluation**
Answers are evaluated across five dimensions: clarity, technical accuracy, depth, structure, and relevance. Weights are adjusted based on interview type - technical interviews emphasize accuracy (30%), while behavioral interviews prioritize structure (30%). The system compares candidate responses to historical high-performing answers for percentile ranking.

**Interview State Management**
Each interview session maintains complete state including question history, answer timestamps, evaluation scores, and media references. Sessions can be paused, resumed, or recovered after unexpected disconnections.

### Skill Gap Analysis

**Multi-Level Gap Classification**
The system categorizes skill gaps into three types: knowledge gaps (skill absent from resume and poor interview performance), explanation gaps (skill listed but inadequate demonstration), and depth gaps (basic understanding without practical examples).

**Gap Clustering**
Related gaps are automatically grouped into learning clusters. For example, missing React, Redux, and React Hooks are presented as a single "React Ecosystem" gap rather than three separate items, making roadmaps more manageable.

**Dynamic Reassessment**
Gap severity is updated based on new evidence from subsequent interviews or resume updates. A critical gap can be downgraded to medium if the candidate demonstrates improvement in related areas.

### Live Coding Environment

**Integrated Code Editor**
Monaco Editor provides an IDE-like coding experience with syntax highlighting, autocomplete, and multi-language support including JavaScript, Python, Java, C++, and more.

**Collaborative Features**
Multiple users can join the same coding session for pair programming practice or technical screening simulations. Changes are synchronized in real-time through WebSocket connections.

**Video Interview Recording**
WebRTC integration enables candidates to record video responses directly in the browser. Recordings are uploaded with metadata linking them to specific interview questions and sessions.

## Technical Architecture

### Technology Stack

**Frontend**
- React 18 with functional components and hooks
- Vite for fast development and optimized builds
- Zustand for lightweight state management
- React Router for client-side routing
- Axios for HTTP requests with interceptors
- Socket.IO client for WebSocket connections
- Monaco Editor for code editing
- Recharts for data visualization
- Tailwind CSS for responsive styling

**Backend**
- Node.js with Express framework
- Socket.IO for real-time bidirectional communication
- Mongoose for MongoDB object modeling
- Multer for multipart file uploads
- JWT for stateless authentication
- Firebase Admin SDK for optional Firebase auth
- PDF-Parse and Mammoth for document parsing
- OpenAI API for natural language generation

**Database**
- MongoDB with Mongoose ODM
- Indexed queries for performance optimization
- Compound indexes on user-version relationships
- Schema versioning for backward compatibility

### Project Structure

```
prepwiser/
├── server/
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express route handlers
│   ├── services/        # Business logic
│   ├── middleware/      # Authentication, validation
│   ├── sockets/         # WebSocket handlers
│   └── config/          # Configuration files
├── src/
│   ├── components/      # React components
│   ├── pages/           # Route-level components
│   ├── services/        # API service layer
│   ├── hooks/           # Custom React hooks
│   ├── store/           # Zustand stores
│   └── utils/           # Utility functions
└── uploads/             # Media storage
```

### API Architecture

RESTful API design with clear separation of concerns:
- Authentication endpoints for user management
- Resume endpoints for upload, parsing, and analysis
- Interview endpoints for session management
- Media endpoints for video/audio storage
- Analytics endpoints for progress tracking

WebSocket namespaces for real-time features:
- /interview - Live interview sessions
- /collaboration - Collaborative code editing

## Implementation Details

### Resume Format Detection Algorithm

The format detector analyzes multiple signals to classify resume structure:

1. Binary pattern analysis for embedded images (common in Europass and Indian formats)
2. Multi-language header detection using regex patterns for English, Spanish, French, German, and Hindi
3. Section ordering analysis to identify summary placement
4. Format-specific markers such as declaration sections or strict template spacing
5. Confidence scoring based on cumulative evidence

Each format receives a score, and the highest-scoring format above the confidence threshold is selected. If no format exceeds the threshold, the resume is classified as unknown and processed with a generic extraction strategy.

### Skill Transferability Matrix

The ontology categorizes skills into hierarchical groups with defined transferability coefficients:

- Frontend Frameworks (React, Angular, Vue): 70% transferability
- SQL Databases (PostgreSQL, MySQL, Oracle): 80% transferability
- Cloud Platforms (AWS, Azure, GCP): 60% transferability
- NoSQL Databases (MongoDB, Cassandra): 50% transferability

When a job description requires a skill the candidate lacks, the system searches for related skills in the same category and calculates partial match scores based on transferability. This provides more nuanced matching than binary presence/absence.

### Interview Evaluation Engine

The evaluation system uses a transparent formula-based approach:

**Clarity Score**: Analyzes sentence structure, vocabulary diversity, and filler word frequency. Adaptive minimum word counts prevent penalizing concise but accurate answers.

**Technical Accuracy**: Compares answer content against expected concepts using keyword matching and semantic similarity. No AI-based scoring is used to maintain auditability.

**Depth Score**: Measures explanation completeness by checking for examples, edge cases, and trade-off discussions.

**Structure Score**: Evaluates logical flow through introduction-body-conclusion presence and transition quality.

**Relevance Score**: Calculates overlap between answer content and question requirements.

Final score is weighted based on interview type, with full transparency into component contributions.

## Development Setup

### Prerequisites

- Node.js 18 or higher
- MongoDB 6.0 or higher (local or Atlas)
- npm or yarn package manager
- Git for version control

### Installation

Clone the repository:
```bash
git clone https://github.com/Sathvik2005/Prepforge.git
cd Prepforge
```

Install dependencies:
```bash
npm install
```

Configure environment variables by creating a .env file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/prepforge
JWT_SECRET=your_secret_key_here
OPENAI_API_KEY=sk-your-openai-key
VITE_API_URL=http://localhost:5000/api
```

Start the development environment:
```bash
npm run dev
```

This command starts both the backend server (port 5000) and frontend development server (port 3000) concurrently.

### Testing

Access the application at http://localhost:3000

Backend API is available at http://localhost:5000/api

MongoDB connection status is displayed in the terminal output.

## Academic Justification

This project was designed with Senior Design Project evaluation criteria in mind, emphasizing:

**Transparency and Reproducibility**
All scoring mechanisms use documented formulas rather than black-box AI models. The same inputs always produce identical outputs, enabling peer review and debugging.

**Evidence-Based Design**
Feature improvements were motivated by analysis of real-world recruitment workflows and documented limitations in existing systems. Each enhancement addresses specific identified problems with measurable success criteria.

**Auditability**
Every decision point in the evaluation pipeline is logged and traceable. Candidates can inspect why they received specific scores by examining component breakdowns and weight distributions.

**Real-World Applicability**
The system handles edge cases common in production environments including malformed resumes, network interruptions, partial data extraction, and diverse international formats.

**Extensibility**
The skill ontology and role weight configurations are defined in data structures that can be updated without code changes, enabling continuous improvement as new technologies emerge.

## Research and Documentation

Complete technical documentation is available in the repository:

- ARCHITECTURE.md - System design and component interactions
- API.md - Complete API endpoint reference
- FEATURES.md - Detailed feature descriptions
- FEATURE_IMPROVEMENTS_ANALYSIS.md - Systematic analysis of 16 core features
- DEV_SETUP.md - Development environment guide
- INTEGRATION_STATUS.md - Frontend-backend integration details

## Future Enhancements

Planned features include:
- Speech-to-text transcription for interview answers
- Behavioral interview STAR format detection
- Live code execution sandbox for algorithmic challenges
- Multi-language coding support beyond JavaScript
- PDF report generation with visualizations
- Adaptive difficulty based on candidate performance
- AI audit logging and bias detection

## Project Status

Current implementation includes:
- Multi-format resume parser with version tracking
- Role-aware ATS scoring with TF-IDF analysis
- Semantic skill matching with transferability analysis
- Live interview system with WebSocket communication
- Video recording and media management
- Deterministic evaluation engine
- Skill gap detection and learning paths

The platform is production-ready for core workflows including resume upload, interview simulation, and progress tracking. Advanced features are under active development.

## License

MIT License - see LICENSE file for details

## Contributors

Developed as part of academic research into AI-assisted technical interview preparation systems.

## Contact

For questions or collaboration opportunities, please open an issue in the GitHub repository.
