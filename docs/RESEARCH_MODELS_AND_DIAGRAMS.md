# PrepForge: Architectural Models and System Flow Diagrams

This document contains comprehensive structural architectures and working model flowcharts for PrepForge. These diagrams have been mapped precisely to align with the core research principles discussed in the **Explainable and Fair AI in Recruitment** Literature Survey (`RESEARCH_PAPER.md`).

They provide a visual, professional, and academic explanation of the internal pipelines that make the platform transparent, highly performant, and fair to candidates.

---

## 1. High-Level Macro System Architecture
This structural diagram illustrates the comprehensive technology stack serving client requests, managing state, handling real-time multimedia connections, and interacting with foundation LLM endpoints. 

```mermaid
graph TD
    subgraph Client Application [Frontend: React 18 + Vite]
        UI[User Interface / Pages]
        State[Zustand State Manager]
        Editor[Monaco Code Editor]
        WebRTC[Browser Media API]
    end

    subgraph API Gateway [Backend: Node.js + Express]
        REST[RESTful Route Controllers]
        Auth[JWT Authentication]
        WSS[WebSocket / Socket.IO Gateway]
    end

    subgraph Core AI & Deterministic Engines
        Parser[Multi-Format Parsing Engine]
        Matcher[Semantic Skill Transferability Engine]
        Evaluator[Deterministic Multidimensional Evaluator]
    end

    subgraph External & Persistence Layer
        DB[(MongoDB via Mongoose)]
        LLM[[OpenAI API / GPT-4]]
    end

    %% Connections
    UI -->|HTTP Requests| REST
    State -->|Bind| UI
    WebRTC -.->|Live Video/Audio| UI
    UI <-->|Bidirectional Real-time| WSS
    
    REST --> Auth
    REST --> Parser
    REST --> Matcher
    WSS <--> Evaluator
    
    Parser --> DB
    Matcher --> DB
    Evaluator --> DB
    
    Evaluator <-->|Context Formulation & Question Generation| LLM
```

### Explanation:
The macroscopic view exhibits a clear separation of concerns (SoC). Real-time dependencies (like Live Code Evaluation and Conversational Interviews) strictly utilize the WebSocket Gateway, avoiding REST latency. The core AI modules execute exclusively on the backend to prevent malicious client mutations. The deterministic evaluator (the scoring framework) wraps around the LLM, meaning the AI only *generates* language, but the system's deterministic logic *grades* the language, preventing LLM "black-box" grading biases.

---

## 2. Explainable NLP Resume Pipeline (Smart-Hiring Flow)
To understand how the system extracts candidate features intelligently while avoiding keyword-stuffing limitations, we map out the NLP Pipeline. This mirrors the "Smart-Hiring" capabilities denoted in architectural research.

```mermaid
flowchart LR
    Upload[Upload Resume PDF/Docx] --> Parser(Document Parsing Module)
    Parser --> Structure{Format Heuristic Detector}
    Structure -->|Western Format| Extract1[Extract Standard Layout]
    Structure -->|Europass Format| Extract2[Extract Dual-Column]
    Structure -->|Indian Format| Extract3[Extract Data-Heavy]
    
    Extract1 & Extract2 & Extract3 --> NER(Named Entity Recognition)
    NER --> Ontology[(Skill Ontology Database)]
    
    Ontology --> ContextExtract(Extract Proficiency & Experience Context)
    ContextExtract --> GenProfile[Generate Structured Candidate Profile]
    
    GenProfile --> Demand{Compare vs Job Demand}
    Demand -->|TF-IDF / Semantic Proximity| Score[Calculate Proximity Score]
    
    Score --> Output[Output: Explainable Candidate Match Score]
    
    style Output fill:#fefefe,stroke:#333,stroke-width:2px
```

### Explanation:
Traditional Parsers fail if a candidate uploads an unconventional resume (rigid boundaries). PrepForge utilizes a Structure Heuristic Detector to ascertain document geography dynamically. Following extraction, the NER engine maps text strings to the **Skill Ontology Database** (e.g., mapping "ReactJS" to "React"). Instead of simple presence verification, the Pipeline extracts syntactic context around the entity (e.g., isolating the phrase "5+ years of" leading up to "Python") to deduce empirical experience depth efficiently.

---

## 3. Conversational AI Interview Interaction Loop
This diagram showcases how the real-time interaction flows between candidate input, prompting engineering via LLM, and transparent mathematical scoring.

```mermaid
sequenceDiagram
    participant Candidate
    participant WSS as Socket.IO (Server)
    participant LLM as GPT-4 (Generator)
    participant Evaluator as Deterministic Logic Engine

    Candidate->>WSS: Start Session Event
    WSS->>LLM: Send structured prompt (Resume + Job + Gaps)
    LLM-->>WSS: Return dynamic interview question
    WSS-->>Candidate: Question rendered / Voice synth
    
    Candidate->>WSS: Video/Audio Transcribed Answer 
    WSS->>Evaluator: Dispatch text for deterministic scoring
    
    Note over Evaluator: 1. Clarity Check (Lexical diversity)<br/>2. Depth Check (Examples present?)<br/>3. Accuracy Check (Keyword density)<br/>4. Structure Check (Intro-Body-Conclusion)
    
    Evaluator-->>WSS: Generate 5-Dimensional Score
    WSS-->>Candidate: Real-time UI feedback / Score Update
```

### Explanation:
The Conversational Pipeline explicitly demonstrates accountability. Highlighting interactions between the Socket Server and LLM shows that LLM generation executes synchronously before the query arrives to the client. The most important characteristic here is the **Deterministic Logic Engine**. When a candidate answers, the LLM is bypassed. The response is graded algorithmically via transparent checks (lexical diversity, expected semantic overlap density), assuring extreme reproducibility in case an auditor or regulator wishes to verify why a candidate failed.

---

## 4. Skill Gap Cluster & Bias Mitigation Feed Architecture
This diagram outlines how discrepancies are converted into actionable learning pathways. Additionally, it highlights where XAI principles execute logically as a bias supervision layer.

```mermaid
graph TD
    A[Interview Performance Analysis] --> C((Feature Vector Aggregator))
    B[Resume Match Deficits] --> C
    
    C --> D{Gap Identification}
    D -->|Skill Not Present| E1[Knowledge Gap]
    D -->|Poor Articulation| E2[Explanation Gap]
    D -->|Lacking Examples| E3[Depth Gap]
    
    E1 & E2 & E3 --> F(Intelligent Cluster Grouping)
    
    %% Bias Mitigation Layer loop representing SHAP explanation logic
    F --> G[Pathway Allocation]
    
    subgraph XAI Bias Auditor Layer
    G -.-> H[Examine Variables Used]
    H -.->|Detect Protected Attributes| I(Flag Demographic / Irrelevant Feature Bias)
    I -.->|Drop Biased Variable| C
    end
    
    G --> J((Publish Personalized Roadmap))
    
    style XAI Bias Auditor Layer fill:#e0f7fa,stroke:#00acc1,stroke-width:1.5px
    style J fill:#fefefe,stroke:#4caf50,stroke-width:2px
```

### Explanation:
A primary issue in skill progression is overwhelming candidates. If a candidate is missing React, Next.js, and Redux, traditional engines display three severe penalties. PrepForge's **Intelligent Cluster Grouping** recognizes that these are node children of the React Ecosystem and produces ONE "Pathway Allocation," streamlining cognitive load. 
Crucially, the theoretical **XAI Bias Auditor Layer** sits atop this. It examines what variables fueled the gaps (e.g., if Name, Gender, or geographic zip proxy data skewed the generation) and prunes them from the Feature Vector Aggregator to ensure demographic parity and unwavering fairness.
