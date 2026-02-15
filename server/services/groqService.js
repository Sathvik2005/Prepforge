/**
 * Groq AI Service - For Roadmap Features
 * Fast, reliable AI service using Groq's LLaMA models
 */

import OpenAI from 'openai';

// ============= CONFIGURATION =============

const CONFIG = {
  timeout: 30000,        // 30 seconds (Groq is faster)
  maxRetries: 1,         // Single retry
  retryDelay: 1000,      // 1 second delay
  model: 'llama-3.3-70b-versatile', // Groq's best model
  temperature: 0.7,
  maxTokens: 4096
};

// ============= GROQ CLIENT =============

let groqClient = null;

// Initialize Groq client
function initializeGroq() {
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY not configured');
    return null;
  }

  if (!process.env.GROQ_API_KEY.startsWith('gsk_')) {
    console.error('❌ Invalid GROQ_API_KEY format (should start with gsk_)');
    return null;
  }

  try {
    groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY.trim(),
      baseURL: 'https://api.groq.com/openai/v1',
      timeout: CONFIG.timeout
    });
    console.log('✅ Groq service initialized for Roadmap features');
    return groqClient;
  } catch (error) {
    console.error('❌ Failed to initialize Groq:', error.message);
    return null;
  }
}

// Get or initialize client
function getClient() {
  if (!groqClient) {
    groqClient = initializeGroq();
  }
  return groqClient;
}

// Initialize on module load
initializeGroq();

// ============= CORE FUNCTION =============

/**
 * Create chat completion with Groq (for Roadmap generation)
 * @param {Array} messages - Chat messages
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} AI response
 */
export async function createChatCompletion(messages, options = {}) {
  const client = getClient();
  
  if (!client) {
    console.error('❌ Groq client not available');
    throw new Error('Groq AI service unavailable - API key not configured');
  }

  // Validate messages
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages must be a non-empty array');
  }

  // Merge options with defaults
  const config = {
    model: options.model || CONFIG.model,
    temperature: options.temperature !== undefined ? options.temperature : CONFIG.temperature,
    max_tokens: options.max_tokens || options.maxTokens || CONFIG.maxTokens,
    messages
  };

  console.log(`🚀 Groq AI Request: ${config.model} (temp: ${config.temperature}, max_tokens: ${config.max_tokens})`);

  let lastError = null;
  const maxAttempts = CONFIG.maxRetries + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`📡 Groq Attempt ${attempt}/${maxAttempts}...`);

      // Create completion with timeout
      const startTime = Date.now();
      const response = await Promise.race([
        client.chat.completions.create(config),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Groq request timeout')), CONFIG.timeout)
        )
      ]);

      const duration = Date.now() - startTime;
      console.log(`✅ Groq response received in ${duration}ms`);

      // Extract content
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq');
      }

      return {
        success: true,
        content: content.trim(),
        model: response.model,
        usage: response.usage,
        provider: 'groq',
        metadata: {
          provider: 'groq',
          model: response.model,
          cached: false,
          degradedMode: false
        },
        attempt
      };

    } catch (error) {
      lastError = error;
      console.error(`❌ Groq Attempt ${attempt} failed:`, error.message);

      // Check for rate limit
      if (error.status === 429 || error.message?.includes('rate limit')) {
        console.error('⚠️ Groq rate limit exceeded');
        throw new Error('Groq AI rate limit exceeded - please try again in a moment');
      }

      // Check for authentication error
      if (error.status === 401 || error.message?.includes('authentication')) {
        console.error('⚠️ Groq authentication failed');
        throw new Error('Groq AI authentication failed - invalid API key');
      }

      // If this was the last attempt, throw error
      if (attempt === maxAttempts) {
        break;
      }

      // Wait before retry
      console.log(`⏳ Waiting ${CONFIG.retryDelay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
    }
  }

  // All attempts failed
  console.error('❌ All Groq attempts failed:', lastError?.message);
  throw new Error(`Groq request failed after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
}

// ============= ROADMAP GENERATION =============

/**
 * Generate learning roadmap with Groq
 * @param {Object} params - Roadmap parameters
 * @returns {Promise<Object>} Generated roadmap
 */
export async function generateRoadmap(params) {
  try {
    console.log('🗺️ Generating roadmap with Groq...');

    const { goal, currentLevel, targetRole, timeframe, skills, preferredTopics, jobDescription } = params;

    // Build comprehensive prompt
    let prompt = `Generate a comprehensive, personalized learning roadmap:

**User Profile:**
- Learning Goal: ${goal}
- Current Level: ${currentLevel}
- Target Role: ${targetRole || 'Not specified'}
- Timeframe: ${timeframe?.value || 12} ${timeframe?.unit || 'weeks'}
- Current Skills: ${skills?.length > 0 ? skills.join(', ') : 'None specified'}
- Preferred Topics: ${preferredTopics?.length > 0 ? preferredTopics.join(', ') : 'Any'}`;

    if (jobDescription) {
      prompt += `\n\n**Target Job Description:**\n${jobDescription}`;
    }

    prompt += `\n\n**Generate a structured, comprehensive roadmap with:**

1. **Title** - Clear, motivating title (e.g., "Full Stack Developer Journey")
2. **Summary** - 2-3 sentence overview of the learning path
3. **Skill Gap Analysis** - Current vs required skills with actionable gaps
4. **Milestones** - 4-8 major learning milestones, each with:
   - id: Unique identifier (milestone-1, milestone-2, etc.)
   - title: Clear milestone name
   - description: What you'll achieve (2-3 sentences)
   - duration: Time estimate (e.g., "2-3 weeks")
   - week: Starting week number
   - skills: Array of specific skills to master
   - resources: Array of learning resources with:
     - type: "course", "book", "article", "video", "practice"
     - title: Resource name
     - url: Link (use realistic examples like Udemy, Coursera, MDN, etc.)
     - description: Why this resource
   - projects: Array of hands-on projects with:
     - name: Project title
     - description: What to build
     - skills: Skills practiced
     - estimatedHours: Time estimate
   - assessment: How to evaluate mastery
   - status: "pending" (default)
5. **Weekly Commitment** - Realistic time allocation (hours/week)
6. **Total Duration** - Total weeks or months
7. **Interview Prep** - Interview preparation tips
8. **Career Advice** - Industry insights and next steps

**IMPORTANT**: Return ONLY valid JSON with this EXACT structure:
{
  "title": "Full Stack Developer Roadmap",
  "summary": "Transform from a beginner to a job-ready full stack developer...",
  "skillGapAnalysis": {
    "current": ["JavaScript basics", "HTML/CSS"],
    "required": ["React", "Node.js", "MongoDB", "REST APIs", "Git"],
    "gaps": ["Backend development", "Database design", "API design", "Deployment"]
  },
  "milestones": [
    {
      "id": "milestone-1",
      "title": "Frontend Fundamentals",
      "description": "Master HTML, CSS, and JavaScript...",
      "duration": "2-3 weeks",
      "week": 1,
      "skills": ["HTML5", "CSS3", "JavaScript ES6+", "Responsive Design"],
      "resources": [
        {
          "type": "course",
          "title": "Modern JavaScript From The Beginning",
          "url": "https://www.udemy.com/course/modern-javascript-from-the-beginning/",
          "description": "Comprehensive JavaScript course covering ES6+"
        }
      ],
      "projects": [
        {
          "name": "Portfolio Website",
          "description": "Build a responsive personal portfolio",
          "skills": ["HTML", "CSS", "JavaScript"],
          "estimatedHours": 15
        }
      ],
      "assessment": "Complete 3 projects demonstrating responsive design",
      "status": "pending"
    }
  ],
  "weeklyCommitment": "10-15 hours",
  "totalDuration": "12 weeks",
  "interviewPrep": "Tips for technical interviews...",
  "careerAdvice": "Industry insights and growth path..."
}`;

    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert career counselor and learning path designer. Generate structured, actionable roadmaps that help people achieve their career goals. Always return valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: 0.7,
      max_tokens: 4096
    });

    // Parse response
    let roadmap;
    try {
      // Try to extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        roadmap = JSON.parse(jsonMatch[0]);
      } else {
        roadmap = JSON.parse(response.content);
      }

      // Normalize and validate structure
      roadmap = normalizeRoadmapStructure(roadmap, params);

    } catch (parseError) {
      console.warn('⚠️ Failed to parse JSON, using fallback structure');
      roadmap = createFallbackRoadmap(params);
    }

    console.log('✅ Roadmap generated with Groq');

    return {
      success: true,
      roadmap,
      metadata: {
        provider: 'groq',
        model: CONFIG.model
      }
    };

  } catch (error) {
    console.error('❌ Roadmap generation error:', error.message);
    
    // Return fallback roadmap instead of throwing
    return {
      success: true,
      roadmap: createFallbackRoadmap(params),
      metadata: {
        provider: 'groq',
        model: CONFIG.model,
        degradedMode: true
      }
    };
  }
}

/**
 * Normalize roadmap structure to ensure all required fields
 */
function normalizeRoadmapStructure(roadmap, params) {
  // Ensure milestones have IDs and proper structure
  if (roadmap.milestones && Array.isArray(roadmap.milestones)) {
    roadmap.milestones = roadmap.milestones.map((milestone, idx) => ({
      id: milestone.id || `milestone-${idx + 1}`,
      title: milestone.title || `Phase ${idx + 1}`,
      description: milestone.description || '',
      duration: milestone.duration || '1-2 weeks',
      week: milestone.week || (idx * 2 + 1),
      skills: Array.isArray(milestone.skills) ? milestone.skills : [],
      resources: Array.isArray(milestone.resources) ? milestone.resources.map(r => ({
        type: r.type || 'course',
        title: r.title || r.name || 'Resource',
        url: r.url || r.link || '#',
        description: r.description || ''
      })) : [],
      projects: Array.isArray(milestone.projects) ? milestone.projects.map(p => ({
        name: p.name || p.title || 'Project',
        description: p.description || '',
        skills: Array.isArray(p.skills) ? p.skills : [],
        estimatedHours: p.estimatedHours || p.hours || 10
      })) : [],
      assessment: milestone.assessment || 'Complete project and demonstrate skills',
      status: milestone.status || 'pending'
    }));
  }

  // Ensure other required fields
  return {
    title: roadmap.title || params.goal || 'Learning Roadmap',
    summary: roadmap.summary || `Your personalized path to ${params.goal}`,
    skillGapAnalysis: roadmap.skillGapAnalysis || {
      current: params.skills || [],
      required: [],
      gaps: []
    },
    milestones: roadmap.milestones || [],
    weeklyCommitment: roadmap.weeklyCommitment || '10-15 hours',
    totalDuration: roadmap.totalDuration || `${params.timeframe?.value || 12} ${params.timeframe?.unit || 'weeks'}`,
    interviewPrep: roadmap.interviewPrep || 'Practice regularly and build projects',
    careerAdvice: roadmap.careerAdvice || 'Stay consistent and keep learning'
  };
}

/**
 * Create fallback roadmap when AI generation fails
 */
function createFallbackRoadmap(params) {
  const { goal, currentLevel, skills, timeframe } = params;
  
  return {
    title: goal || 'Learning Roadmap',
    summary: `Your personalized roadmap to achieve: ${goal}. This is a foundational plan to get you started.`,
    skillGapAnalysis: {
      current: skills || [],
      required: ['Core fundamentals', 'Practical projects', 'Interview preparation'],
      gaps: ['Structured learning path needed']
    },
    milestones: [
      {
        id: 'milestone-1',
        title: 'Foundation & Fundamentals',
        description: `Build a strong foundation in ${goal}. Master the core concepts and essential skills.`,
        duration: '2-3 weeks',
        week: 1,
        skills: ['Fundamentals', 'Best practices', 'Core concepts'],
        resources: [
          {
            type: 'course',
            title: 'Getting Started',
            url: '#',
            description: 'Foundation course'
          }
        ],
        projects: [
          {
            name: 'Starter Project',
            description: 'Build your first project',
            skills: ['Fundamentals'],
            estimatedHours: 10
          }
        ],
        assessment: 'Complete foundational project',
        status: 'pending'
      },
      {
        id: 'milestone-2',
        title: 'Practical Application',
        description: 'Apply your knowledge through hands-on projects and real-world scenarios.',
        duration: '3-4 weeks',
        week: 4,
        skills: ['Applied skills', 'Problem solving', 'Project development'],
        resources: [
          {
            type: 'practice',
            title: 'Practice Challenges',
            url: '#',
            description: 'Hands-on exercises'
          }
        ],
        projects: [
          {
            name: 'Intermediate Project',
            description: 'Build a practical application',
            skills: ['Applied skills'],
            estimatedHours: 20
          }
        ],
        assessment: 'Complete intermediate project',
        status: 'pending'
      },
      {
        id: 'milestone-3',
        title: 'Advanced Topics & Portfolio',
        description: 'Master advanced concepts and build your professional portfolio.',
        duration: '4-5 weeks',
        week: 8,
        skills: ['Advanced techniques', 'Portfolio development', 'Professional practices'],
        resources: [
          {
            type: 'project',
            title: 'Portfolio Development',
            url: '#',
            description: 'Build showcase projects'
          }
        ],
        projects: [
          {
            name: 'Capstone Project',
            description: 'Build a comprehensive portfolio project',
            skills: ['All learned skills'],
            estimatedHours: 30
          }
        ],
        assessment: 'Complete portfolio-ready capstone project',
        status: 'pending'
      }
    ],
    weeklyCommitment: '10-15 hours',
    totalDuration: `${timeframe?.value || 12} ${timeframe?.unit || 'weeks'}`,
    interviewPrep: 'Practice technical questions, build projects, and prepare a strong portfolio.',
    careerAdvice: 'Focus on consistent learning, networking, and building real-world projects to demonstrate your skills.'
  };
}

// ============= HEALTH CHECK =============

/**
 * Check if Groq service is available
 * @returns {Promise<Object>} Health status
 */
export async function healthCheck() {
  try {
    const client = getClient();
    if (!client) {
      return {
        available: false,
        provider: 'groq',
        error: 'API key not configured'
      };
    }

    // Try a simple completion
    await createChatCompletion([
      { role: 'user', content: 'Hello' }
    ], {
      max_tokens: 5
    });

    return {
      available: true,
      provider: 'groq',
      model: CONFIG.model
    };

  } catch (error) {
    return {
      available: false,
      provider: 'groq',
      error: error.message
    };
  }
}

// ============= RESUME ANALYSIS FUNCTIONS =============

/**
 * Analyze resume with optional job description
 */
export async function analyzeResume(resumeText, jobDescription = '', options = {}) {
  try {
    console.log('📄 Analyzing resume with Groq...');

    let prompt = `Analyze this resume and provide comprehensive feedback:\n\n${resumeText}`;
    
    if (jobDescription) {
      prompt += `\n\nTarget Job Description:\n${jobDescription}\n\nProvide analysis including skill match percentage and gaps.`;
    }

    prompt += `\n\nProvide analysis in this structure:
- **Summary**: Brief overview of candidate profile
- **Strengths**: Key strengths (3-5 points)
- **Areas for Improvement**: Constructive feedback (3-5 points)
- **Skills**: Technical and soft skills identified
- **Experience Level**: Assessed experience level
- **ATS Score**: Estimated ATS compatibility score (0-100)`;

    if (jobDescription) {
      prompt += `
- **Job Match Score**: How well resume matches job (0-100)
- **Missing Skills**: Skills required for job but not in resume
- **Recommendations**: Specific suggestions to improve match`;
    }

    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert resume reviewer and career counselor. Provide detailed, constructive feedback.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000
    });

    return {
      success: true,
      analysis: response.content,
      metadata: {
        provider: 'groq',
        model: CONFIG.model
      }
    };
  } catch (error) {
    console.error('❌ Resume analysis error:', error.message);
    return {
      success: false,
      analysis: 'Resume analysis is temporarily unavailable. Please try again.',
      error: error.message
    };
  }
}

/**
 * Rephrase text professionally
 */
export async function rephraseText(text, options = {}) {
  try {
    console.log('✍️ Rephrasing text with Groq...');

    const prompt = `Rephrase this resume content professionally using strong action verbs and quantifiable achievements:

Original: ${text}

Requirements:
1. Use strong action verbs (Led, Developed, Implemented, Achieved, etc.)
2. Add quantifiable metrics where possible
3. Make it ATS-friendly with industry keywords
4. Keep it concise and impactful
5. Format as clear bullet points

Provide 3-5 professional variations as numbered bullet points.`;

    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert resume writer specializing in impactful, ATS-optimized content.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 500
    });

    return {
      success: true,
      rephrased: response.content,
      metadata: {
        provider: 'groq',
        model: CONFIG.model
      }
    };
  } catch (error) {
    console.error('❌ Rephrase error:', error.message);
    return {
      success: false,
      rephrased: 'Rephrase service temporarily unavailable.',
      error: error.message
    };
  }
}

/**
 * Generate cover letter
 */
export async function generateCoverLetter(resumeText, jobDescription, options = {}) {
  try {
    console.log('📧 Generating cover letter with Groq...');

    const prompt = `Generate a professional, personalized cover letter based on:

**Resume:**
${resumeText.substring(0, 2000)}

**Job Description:**
${jobDescription.substring(0, 2000)}

**Requirements:**
1. Professional tone and format
2. Highlight relevant experience from resume
3. Show enthusiasm for the specific role
4. Address key requirements from job description
5. Include clear opening, body (2-3 paragraphs), and closing
6. Make it personal and authentic, not generic

Generate a complete, ready-to-use cover letter.`;

    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert career counselor and professional writer specializing in compelling cover letters.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1500
    });

    return {
      success: true,
      coverLetter: response.content,
      metadata: {
        provider: 'groq',
        model: CONFIG.model
      }
    };
  } catch (error) {
    console.error('❌ Cover letter error:', error.message);
    return {
      success: false,
      coverLetter: 'Cover letter generation temporarily unavailable.',
      error: error.message
    };
  }
}

/**
 * Generate interview questions and answers
 */
export async function generateInterviewQA(resumeText, jobDescription, options = {}) {
  try {
    console.log('💬 Generating interview Q&A with Groq...');

    const prompt = `Generate tailored interview questions and answers based on:

**Resume:**
${resumeText.substring(0, 2000)}

**Job Description:**
${jobDescription.substring(0, 2000)}

Generate 8-10 interview questions covering:
1. Technical skills mentioned in resume
2. Experience and achievements
3. Behavioral questions (STAR method)
4. Role-specific questions from job description
5. Situational questions

For each question, provide:
- The question
- A strong sample answer based on the resume
- Tips for answering

Format as:
**Q1: [Question]**
**Sample Answer:** [Answer]
**Tips:** [Tips]

Make it practical and tailored to this specific candidate and role.`;

    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert interview coach helping candidates prepare for interviews.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 3000
    });

    return {
      success: true,
      interviewQA: response.content,
      metadata: {
        provider: 'groq',
        model: CONFIG.model
      }
    };
  } catch (error) {
    console.error('❌ Interview Q&A error:', error.message);
    return {
      success: false,
      interviewQA: 'Interview Q&A generation temporarily unavailable.',
      error: error.message
    };
  }
}

export default {
  createChatCompletion,
  generateRoadmap,
  analyzeResume,
  rephraseText,
  generateCoverLetter,
  generateInterviewQA,
  healthCheck
};
