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

- RESEARCH_PAPER.md - Comprehensive Literature Survey and Proposed System academic contribution
- ARCHITECTURE.md - System design and component interactions
- API.md - Complete API endpoint reference
- FEATURES.md - Detailed feature descriptions
- FEATURE_IMPROVEMENTS_ANALYSIS.md - Systematic analysis of 16 core features
- DEV_SETUP.md - Development environment guide
- INTEGRATION_STATUS.md - Frontend-backend integration details

## Literature Survey: Explainable and Fair AI in Recruitment

<details>
<summary><strong>Click to expand the full Literature Survey and Proposed System details</strong></summary>

### Literature Survey on Explainable and Fair AI in Recruitment

Recent years have seen widespread adoption of AI in hiring. Nearly 90% of companies now use some form of AI in recruitment, expecting efficiency gains. However, this trend raises concerns about fairness and transparency. On one hand, AI can reduce human “noise” and bias in decisions; on the other, it risks automating discrimination and reshaping what counts as fair. Fabris et al. note that while replacing biased recruiters is a goal, whether algorithmic hiring truly improves fairness over simpler alternatives remains an open question. This high-stakes context has spurred research into interpretable, bias-aware AI systems in recruitment.

#### Explainability in Hiring Algorithms
A central theme is making hiring AI transparent and interpretable. Researchers highlight that many AI hiring tools operate as “black boxes,” offering little insight into their decisions. This opacity undermines accountability: candidates rejected by opaque systems receive no explanation, and regulators worry about unchecked biases. Consequently, Explainable AI (XAI) is proposed as a remedy. Fabeyo’s systematic review identifies popular XAI techniques (e.g. SHAP, LIME, counterfactuals, decision trees) used in hiring contexts. Such methods aim to reveal the model’s logic: for instance, highlighting resume features or words that drove a decision. Studies show XAI can improve understanding and reduce biases, but also face challenges in complexity and usability. A human-centred design and supportive regulation are recommended to ensure XAI actually promotes fair and trustworthy hiring.

#### Candidate Perceptions and Trust
Beyond the algorithms themselves, researchers study how candidates react to AI hiring. Experimental work finds that transparency matters: when job ads include information about the AI system or third-party audits, applicants report more favorable attitudes, trust, and willingness to speak positively of the company. For example, Xiong and Kim show that exposing applicants to “AI transparency” cues in job postings significantly boosts trust and positive word-of-mouth compared to opaque ads. Similarly, Bhattacharya and Verbert developed a multi-agent LLM-based recruitment assistant and found that job seekers perceived it as more actionable, trustworthy, and fair than traditional opaque processes. These studies underline that explainability isn’t just a technical issue but affects user experience: making AI decisions understandable to applicants tends to enhance perceived fairness and confidence in the process.

#### Technical Solutions: Pipelines and Models
Researchers are developing diverse AI frameworks for hiring that emphasize interpretability. Khelkhal and Lanasri’s Smart-Hiring pipeline uses NLP techniques to parse resumes and job descriptions into structured data (via document parsing and named-entity recognition) and then encodes both in a shared semantic space. This allows the system to match candidates to roles and explain the match by inspecting extracted entities (e.g. skills, qualifications) and their similarity scores. On real datasets, Smart-Hiring achieved competitive matching accuracy while preserving high interpretability, demonstrating that an end-to-end pipeline can be both effective and transparent.

Another trend is leveraging foundation models (large language models) for recruitment. A recent study evaluated nine LLMs (e.g. LLaMA, Mistral, Phi) on a candidate screening task. These models, even in a zero-shot setting with no fine-tuning, achieved above-chance performance (average AUC > 0.5). Adding a few task examples (few-shot) gave only marginal gains, indicating that LLMs’ pre-training already captures much hiring-related knowledge. Crucially, the study analyzed model outputs with XAI tools and prompt techniques, finding that decisions were largely driven by the LLMs’ pre-learned knowledge. The best LLM (in five-shot mode) came within ~3% accuracy of a task-specific classifier, and all LLMs far outperformed a simple baseline in F1 and recall. This suggests that general-purpose language models can serve as viable, competitive recruiters out-of-the-box, and their reasoning can be probed via explainability methods.

#### Bias Detection and Mitigation
Explainability is also being used as a tool for fairness. Alsubaie and Aleisa (2025) propose using SHAP values to inspect bias in hiring models. They applied SHAP to Random Forest, XGBoost and LightGBM classifiers in a recruitment dataset. The analysis uncovered that features like gender, nationality, and even hobbies contributed disproportionately to biased outcomes. By iteratively modifying or removing those features, they rebuilt the models and observed significant improvements: accuracy rose from ~78% to 85%, and all precision/recall metrics improved. Importantly, fairness (demographic parity) jumped from ~0.70 to 0.90, a ~20% reduction in bias. This work demonstrates that XAI can guide bias mitigation: by spotlighting problematic inputs, practitioners can adjust their systems to be both more accurate and fairer.

Going further, graph-based optimization methods have been developed for fair hiring. The GESA framework integrates transformer embeddings with graph neural networks and adversarial debiasing. In large-scale experiments (20,000 candidates, 3,000 roles), GESA achieved 94.5% top-3 matching accuracy and a 37% improvement in diversity representation over baselines. Its fairness score across demographic groups reached 0.98, and the system remained fast and explainable. GESA illustrates a multi-faceted solution: it employs hybrid graph/recommender methods and explicit fairness constraints, while also providing “glass-box” explanations of its allocations. Such approaches highlight how combining deep models with fairness-aware optimization can deliver both high performance and equitable outcomes in candidate-role matching.

#### Survey of Methods and Perspectives
Several recent surveys contextualize these advances. Mersha et al. (2024) offer a broad XAI review across domains, covering terms, taxonomies of methods, and applications. They note that XAI’s goals include transparency, accountability, and fairness, and categorize techniques by how they generate explanations. Though focused on general AI, this survey reinforces that explainability is increasingly seen as key to trustworthy AI development.

Fabeyo’s systematic review (2025) specifically examines XAI in hiring, as mentioned above. It shows that common techniques from the general XAI toolkit (SHAP, LIME, counterfactuals) are being tried in recruitment, but stresses that mere technical fixes may not suffice.

At a higher level, Fabris et al. (2025) provide a multidisciplinary survey of fairness in hiring. They caution against viewing algorithmic hiring through only optimistic or pessimistic lenses. Instead, they cover the full pipeline – datasets, bias measures, mitigation strategies, and legal frameworks – to help stakeholders understand AI’s benefits and limits. Their recommendation for future work echoes the themes above: we need contextualized, regulated AI systems that balance accuracy with social responsibility.

#### Challenges and Future Directions
Despite progress, challenges remain. XAI techniques often trade off interpretability and performance: very complex models may resist full explanation, and humans may still struggle to make sense of technical explanations. Scalability and integration into hiring workflows are nontrivial. On the fairness side, the definitions of fairness themselves can shift when AI is used. As one HBR analysis emphasizes, adopting AI in hiring doesn’t automatically fix bias – it reconfigures what stakeholders consider fair.

Regulation and human-centered design are seen as vital. The XAI hiring survey recommends stronger governance frameworks and user-oriented interfaces to ensure transparency is meaningful. In practice, this might mean involving diverse stakeholders in system design, and providing candidates with clear, actionable explanations of automated decisions.

In summary, recent work shows that a combination of natural-language and graph-based AI methods can achieve high accuracy in recruitment tasks, while explainability tools can improve trust and reduce unfair bias. The literature suggests best results when systems are designed holistically: technologically advanced yet interpretable pipelines, augmented by processes that detect and correct bias. Moving forward, the field is converging on human-aligned, governed AI hiring – systems that not only perform well but also can be audited and justified to users.

---

### Expanded Literature Context: AI-Driven Recruitment Systems

AI-driven recruitment systems are now widely used, but this has prompted intense study of fairness and transparency. Industry reports note that AI adoption in hiring is surging (72% of HR pros in 2025 versus 58% in 2024). Most candidates and HR leaders increasingly trust AI: a 2025 survey found 57% of job-seekers believe AI can reduce bias, and HR confidence in AI recommendations rose from 37% to 51% over a year. Nonetheless, experts warn that AI “reshapes what counts as fair” in hiring, balancing optimistic versus pessimistic views of algorithmic fairness. Algorithmic hiring remains high-stakes (involving structural inequality), so current research emphasizes grounding AI tools in explainability and accountability.

#### Explainable AI in Hiring Algorithms
A major concern is the “black box” nature of many AI hiring tools. Studies highlight that opaque models undermine accountability – e.g. an AI resume screener may reject candidates without explanation. To address this, Explainable AI (XAI) techniques are being applied to recruitment. Fabeyo’s systematic review identifies common XAI methods used in hiring contexts (e.g. SHAP, LIME, decision trees, counterfactuals) and evaluates them on interpretability, fidelity, and fairness. The review finds that XAI can improve understanding and reduce biases, but notes that technical complexity and interpretation issues often limit real-world effectiveness. It recommends a human-centered XAI design and robust regulatory frameworks to ensure transparency in hiring systems.

General XAI research echoes this emphasis on interpretability. Recent surveys stress that modern AI models (deep nets, ensembles) are highly accurate but lack clear reasoning paths. They survey methods like post-hoc explanations (e.g. feature attributions), inherently interpretable models, and interactive visualizations to make AI outputs understandable to humans. Although these reviews cover many domains, the consensus is that enhancing model transparency fosters trust. For example, by exposing key factors (like skill matches or flagged bias) behind hiring recommendations, companies can help regulators and candidates scrutinize AI decisions.

#### Candidate Experience and Trust
Explainability also affects how candidates view the hiring process. Controlled experiments show that transparency matters to applicants. Xiong and Kim find that when job postings include information about AI decision processes (e.g. algorithmic auditing, fairness assurances), applicants report significantly higher trust and positive attitudes toward the company. Conversely, opaque messaging yields skepticism. Similarly, Bhattacharya and Verbert’s user-centric study of a multi-agent AI system reports that job-seekers perceived the explainable multi-agent system as far more “actionable, trustworthy, and fair” than traditional black-box methods. In short, giving candidates insight into why they were (or were not) shortlisted – whether by AI or humans – improves their acceptance and perception of fairness.

#### Technical Approaches and Architectures
Researchers have developed diverse AI systems for recruitment with built-in interpretability:

**NLP Pipelines:** Khelkhal and Lanasri present Smart-Hiring, an NLP pipeline that parses resumes and job descriptions into structured features (via named-entity recognition and embeddings) and computes semantic similarity. Crucially, Smart-Hiring is modular and explainable: it allows users to inspect the extracted entities (e.g. skills, experience) and see how they contribute to the match decision. On real hiring data, this system achieved high matching accuracy while maintaining interpretability.

**Foundation (Language) Models:** Modern work also investigates using pretrained LLMs for candidate selection. One study evaluated nine large language models (e.g. LLaMA variants, Mistral, Phi) in zero- and few-shot résumé screening. These LLMs, without fine-tuning, achieved above-chance performance (average AUC > 0.5) just from applicants’ document features. Providing a few in-context examples gave only marginal gains, suggesting the LLMs’ pretraining imparts broad hiring-relevant reasoning. The researchers used post-hoc XAI (and prompt analyses) to show that the LLMs’ decisions aligned largely with learned job-related knowledge. Notably, the best LLM nearly matched a task-specific model in accuracy, and all LLMs greatly outperformed a simple baseline in recall and F1 score. This line of work indicates that general-purpose AI can be competitive candidates screeners, with the advantage that their reasoning can be probed via explainability tools.

**Graph-Based and Optimization Methods:** Advanced methods combine semantic embeddings with graph neural networks and optimization to ensure fairness. The GESA framework (Graph-Enhanced Semantic Allocation) integrates transformer embeddings, heterogeneous graph learning, adversarial debiasing, and genetic optimization into a unified model. In large-scale experiments (20,000 candidates, 3,000 roles), GESA achieved 94.5% top-3 accuracy and dramatically improved fairness metrics: diversity representation grew by 37%, and a fairness score across demographics reached 0.98. GESA also provides glass-box explainability for its allocations, suitable for diverse industry and academic contexts. This multi-component approach shows how embedding rich candidate-role relationships and explicitly optimizing for equity can yield accurate, fair, and explainable matching.

#### Bias Detection and Mitigation
Explainability is additionally applied to diagnose and reduce bias in models. Alsubaie and Aleisa (2025) demonstrate this by using SHAP explanations on AI hiring models (Random Forest, XGBoost, LightGBM). They used SHAP to identify features – such as gender, nationality, hobbies – that disproportionately drove biased outcomes. By iteratively modifying or removing these features, they retrained the models. The results were striking: accuracy rose from ~78% to 85%, and fairness (measured by demographic parity) improved from ~0.70 to ~0.90 (a ~20% reduction in bias). All classification metrics (precision, recall, F1) improved as well. This case study underscores that XAI techniques like SHAP can be practically used to uncover hidden biases and refine hiring algorithms for both higher accuracy and equity.

Similarly, general fairness research encourages a full-pipeline view. Fabris et al.’s multidisciplinary survey covers system design, bias sources, mitigation strategies, and legal aspects of algorithmic hiring. They emphasize that fairness efforts must go beyond metrics to consider context and stakeholder perspectives. For instance, GESA’s adversarial debiasing reflects the idea that models should be explicitly trained under fairness constraints. And Smart-Hiring’s emphasis on explainability complements such efforts by making it easier to audit decisions. Together, these approaches tackle bias both by what the model is (architecture/training) and how it’s interpreted.

#### Industry and Regulatory Context
Industry studies reinforce the value of explainability. The HireVue 2025 AI report (based on 4,000+ respondents) finds candidates are increasingly optimistic: 57% of workers now believe AI can reduce hiring bias. HR leaders similarly report that AI has become a decision-support tool (not a replacement), with 53% trusting AI recommendations in 2025. These findings align with academic insights: candidates value transparent processes, and leaders see AI as augmenting human judgment. However, both sources also highlight risks. The HireVue report notes concerns about misinformation and calls for "transparent AI processes and clear communication about how hiring technologies are used". Likewise, literature stresses the need for governance: stronger regulatory frameworks and standards are recommended to ensure fairness and accountability.

#### Challenges and Future Directions
The surveyed work reveals persistent challenges and open questions:

**Model Complexity vs Interpretability:** High-performing models (deep nets, ensembles) often remain hard to interpret. Bridging this gap is nontrivial, and some loss of accuracy may be unavoidable when enforcing transparency.

**Regulation and Ethics:** As Fabeyo et al. note, the governance of hiring AI needs strengthening. This means not just technical fixes, but policies ensuring companies audit for bias and explain decisions to regulators and candidates.

**Human-Centred Design:** Explainable systems must be designed for their users. That includes HR professionals and candidates. For example, Bhattacharya & Verbert’s work suggests involving job-seekers in designing XAI interfaces leads to systems perceived as fairer. Ongoing research should include user studies on how people interpret algorithmic feedback and what explanations are most useful.

**Data Bias and Auditing:** Improving data collection and preprocessing is crucial. The mitigation studies showed that we need regular audits of which features influence decisions. Emerging research directions include dataset cleaning, bias quantification, and synthetic data generation to ensure representation.

In summary, the literature indicates that combining technical innovation (advanced AI models, XAI tools) with process-level practices (auditing, regulations, candidate communication) yields the best outcomes. AI can significantly speed up hiring and even enhance fairness, but only if systems are transparent and accountable. Future work should continue to integrate these dimensions, aiming for recruitment platforms where decisions are accurate, explainable, and aligned with human values.

**Key Challenges and Recommendations:**
- **Regulatory & Ethical Oversight:** Implement stronger legal frameworks and bias audits to enforce fairness in AI hiring.
- **User-Friendly Explanations:** Design XAI tools with HR professionals and applicants in mind, providing clear, actionable insights on decisions.
- **Transparency-Performance Trade-off:** Balance model complexity and interpretability by exploring hybrid or inherently interpretable architectures.
- **Data and Bias Management:** Continuously monitor training data and model features for bias (as done via SHAP), and refine models accordingly to maintain both equity and accuracy.

---

### Proposed System / Project Contribution (Academic Tone)

#### 1. Overview of the Proposed System
This project presents an AI-powered, explainable recruitment and interview preparation system that integrates Natural Language Processing (NLP), Large Language Models (LLMs), and Explainable Artificial Intelligence (XAI) to enhance transparency, fairness, and efficiency in hiring-related processes.

The system is designed to address critical limitations identified in existing literature, such as lack of transparency, bias in decision-making, and inefficient candidate-job matching. Unlike traditional black-box recruitment systems, the proposed solution adopts a human-centered, explainable, and modular architecture, enabling both candidates and recruiters to understand the reasoning behind decisions.

#### 2. Motivation Derived from Literature
Existing research highlights several key challenges in AI-driven hiring systems:
- Opacity of decision-making (black-box models) reduces trust and accountability.
- Bias in recruitment algorithms leads to unfair candidate selection.
- Lack of transparency in hiring communication negatively impacts user perception and trust.
- Inefficient resume-job matching using keyword-based systems fails to capture semantic meaning.

Furthermore, recent studies emphasize that Explainable AI (XAI) is essential to ensure fairness, interpretability, and regulatory compliance in high-stakes domains such as hiring. Based on these insights, the proposed project aims to bridge these gaps through an end-to-end explainable AI pipeline.

#### 3. System Architecture and Methodology
The developed system follows a multi-module intelligent architecture, integrating the following components:

**3.1 Resume Intelligence and Parsing**
The system processes resumes in multiple formats and extracts structured information such as skills, experience, and achievements using NLP techniques. This aligns with prior research that emphasizes the importance of transforming unstructured resumes into structured representations for effective analysis.

**3.2 Semantic Candidate-Job Matching**
Unlike traditional keyword-based approaches, the system employs semantic embeddings and similarity scoring to match candidates with job descriptions. This approach overcomes semantic inflexibility issues identified in earlier systems and improves matching accuracy.

**3.3 Explainable AI Integration (XAI)**
To ensure transparency, the system incorporates explainability techniques such as:
- Feature importance analysis
- Skill-based contribution scoring
- Interpretable matching explanations
These mechanisms allow users to understand why a candidate was recommended or rejected, addressing the transparency gap highlighted in prior studies.

**3.4 AI-Based Interview Simulation**
The system includes a conversational interview engine powered by LLMs, which:
- Generates dynamic interview questions
- Evaluates responses across multiple dimensions
- Provides real-time feedback
This extends recent research on AI-driven hiring systems that leverage LLMs for automated candidate evaluation.

**3.5 Skill Gap Analysis and Learning Recommendations**
The system identifies:
- Knowledge gaps
- Explanation gaps
- Depth gaps
...and provides personalized learning paths, enabling continuous candidate improvement.

**3.6 Real-Time Interaction and Feedback**
Through WebSocket-based communication, the system supports:
- Live interviews
- Instant feedback
- Continuous performance tracking
This enhances user engagement and aligns with modern AI-driven interactive recruitment systems.

#### 4. Key Contributions of the Project

**4.1 End-to-End Explainable Recruitment System**
The project provides a complete pipeline, from resume parsing to interview evaluation, ensuring transparency at every stage.

**4.2 Integration of XAI for Fair and Transparent Hiring**
By incorporating explainability techniques, the system:
- Improves trust in AI decisions
- Reduces bias
- Enhances accountability
This directly addresses ethical concerns highlighted in prior research.

**4.3 Use of LLMs for Intelligent Decision Support**
The system leverages LLMs for:
- Natural language understanding
- Dynamic question generation
- Context-aware evaluation
This demonstrates the practical application of foundation models in recruitment.

**4.4 Human-Centered Design Approach**
The system is designed to provide:
- Actionable feedback
- Transparent explanations
- User-friendly interaction
This aligns with emerging research emphasizing user trust and experience in AI systems.

**4.5 Bias Mitigation through Explainability**
By analyzing feature contributions and removing biased attributes, the system contributes toward fairer hiring practices, as suggested in recent studies.

#### 5. Novelty of the Proposed Work
The uniqueness of this project lies in:
- Combining Resume Parsing + Semantic Matching + LLM Interviews + XAI in a single system.
- Providing transparent reasoning instead of black-box outputs.
- Enabling continuous improvement through skill gap analysis.
- Supporting real-time interactive evaluation.

Unlike existing systems that focus on isolated tasks, this project delivers a holistic and explainable recruitment ecosystem.

#### 6. Conclusion
In summary, the proposed system advances the state-of-the-art in AI-driven recruitment by integrating Explainable AI, NLP, and LLM-based interaction into a unified framework. It not only improves efficiency and accuracy but also ensures fairness, transparency, and user trust, which are critical for real-world deployment of AI in hiring systems.

---

### References

**Core XAI & Survey Papers**
- M. Mersha, K. Lam, J. Wood, A. AlShami, and J. Kalita, “Explainable Artificial Intelligence: A Survey of Needs, Techniques, Applications, and Future Direction,” arXiv preprint, 2024. 🔗 https://arxiv.org/abs/2409.00265
- W. Saeed and C. Omlin, “Explainable AI (XAI): A Systematic Meta-Survey of Current Challenges and Future Opportunities,” arXiv preprint, 2021. 🔗 https://arxiv.org/abs/2111.06420
- G. Paliwal et al., “Transformative Impact of Explainable Artificial Intelligence: Bridging Complexity and Trust,” Discover Artificial Intelligence, 2025. 🔗 https://link.springer.com/article/10.1007/s44163-025-00281-1

**XAI in Recruitment / Bias / Fairness**
- R. K. Magham, “Mitigating Bias in AI-Driven Recruitment: The Role of Explainable Machine Learning (XAI),” Int. J. Sci. Res. Comput. Sci. Eng., 2024. 🔗 https://ijsrcseit.com/index.php/home/article/view/CSEIT241051037
- N. Alsubaie and N. Aleisa, “Mitigating Bias in AI Model Using Explainable AI in Hiring Process,” IEEE Access, 2025.
- V. S. Pendyala, N. B. Thakur, and R. Agarwal, “Explainable Use of Foundation Models for Job Hiring,” Electronics (MDPI), 2025.

**Recruitment Systems / NLP / Matching**
- K. Khelkhal and D. Lanasri, “Smart-Hiring: An Explainable End-to-End Pipeline for CV Information Extraction and Job Matching,” arXiv preprint, 2025. 🔗 https://arxiv.org/abs/2511.02537
- R. A. Shah et al., “GESA: Graph-Enhanced Semantic Allocation for Generalized, Fair, and Explainable Candidate-Role Matching,” arXiv preprint, 2025. 🔗 https://arxiv.org/abs/2509.25435
- M. Myneni and F. Quadhari, “Hybrid Transformer-Based Resume Parsing and Job Matching Using SBERT and DeBERTa,” SSRG Int. Journal, 2025.

**AI + Hiring + LLM + Systems**
- A. Bhattacharya and K. Verbert, “Let’s Get You Hired: A Job Seeker’s Perspective on Multi-Agent Recruitment Systems,” ACM UIST, 2025.
- Z. Cheng et al., “A Comprehensive Review of Explainable AI in Computer Vision,” Sensors (MDPI), 2025.

**AI Recruitment + XAI + NLP Frameworks**
- “Optimizing Student Job Placements with NLP and Explainable AI: A Fair and Transparent Hiring Framework,” Array (Elsevier), 2026. 🔗 https://doi.org/10.1016/j.array.2026.100729
- V. Zadykian et al., “Towards Explainable Job Title Matching Using Knowledge Graphs,” arXiv preprint, 2025.
- C. Xue and Z. Gao, “Structured Contrastive Learning for Context-Aware Text Semantic Matching,” arXiv preprint, 2025.

**General XAI Applications (supporting references)**
- H. Eshkiki et al., “A Survey of Explainable AI in Biomedical Informatics,” Applied Sciences (MDPI), 2025. 🔗 https://www.mdpi.com/2076-3417/15/24/12934
- S. Lundberg et al., “From Local Explanations to Global Understanding with Explainable AI,” Nature Machine Intelligence, 2020.

</details>

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
