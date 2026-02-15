/**
 * AI Service - Single Provider Architecture
 * Clean, production-ready AI service using ONLY OpenAI
 * 
 * Features:
 * - Single provider (OpenAI GPT-4o-mini)
 * - One retry on failure
 * - 20 second timeout
 * - Strict error handling
 * - No fallback provider switching
 * - Graceful degradation with safe responses
 */

import OpenAI from 'openai';

// ============= CONFIGURATION =============

const CONFIG = {
  timeout: 20000,        // 20 seconds
  maxRetries: 1,         // Single retry only
  retryDelay: 1000,      // 1 second delay between retries
  model: 'gpt-4o-mini',  // Default model
  temperature: 0.7,      // Default creativity
  maxTokens: 2000        // Default max response length
};

// ============= OPENAI CLIENT =============

let openaiClient = null;

// Initialize OpenAI client
function initializeOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not configured');
    return null;
  }

  if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.error('❌ Invalid OPENAI_API_KEY format');
    return null;
  }

  try {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY.trim(),
      timeout: CONFIG.timeout,
      maxRetries: 0 // We handle retries manually
    });
    console.log('✅ OpenAI service initialized');
    return openaiClient;
  } catch (error) {
    console.error('❌ Failed to initialize OpenAI:', error.message);
    return null;
  }
}

// Get or initialize client
function getClient() {
  if (!openaiClient) {
    openaiClient = initializeOpenAI();
  }
  return openaiClient;
}

// Initialize on module load
initializeOpenAI();

// ============= CORE AI FUNCTION =============

/**
 * Create chat completion with OpenAI
 * @param {Array} messages - Chat messages array
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} AI response
 */
export async function createChatCompletion(messages, options = {}) {
  const client = getClient();
  
  if (!client) {
    console.error('❌ OpenAI client not available');
    throw new Error('AI service unavailable - API key not configured');
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

  console.log(`🤖 AI Request: ${config.model} (temp: ${config.temperature}, max_tokens: ${config.max_tokens})`);

  let lastError = null;
  const maxAttempts = CONFIG.maxRetries + 1; // 1 initial + 1 retry = 2 total

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`📡 Attempt ${attempt}/${maxAttempts}...`);

      // Create completion with timeout
      const startTime = Date.now();
      const response = await Promise.race([
        client.chat.completions.create(config),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), CONFIG.timeout)
        )
      ]);

      const duration = Date.now() - startTime;
      console.log(`✅ AI response received in ${duration}ms`);

      // Extract content
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }

      return {
        success: true,
        content: content.trim(),
        model: response.model,
        usage: response.usage,
        provider: 'openai',
        cached: false,
        attempt
      };

    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed:`, error.message);

      // Check if it's a quota/rate limit error
      if (error.status === 429 || error.message?.includes('quota')) {
        console.error('⚠️ OpenAI quota exceeded');
        throw new Error('AI service quota exceeded - please try again later');
      }

      // Check if it's an authentication error
      if (error.status === 401 || error.message?.includes('authentication')) {
        console.error('⚠️ OpenAI authentication failed');
        throw new Error('AI service authentication failed - invalid API key');
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
  console.error('❌ All attempts failed:', lastError?.message);
  throw new Error(`AI request failed after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
}

// ============= SPECIALIZED AI FUNCTIONS =============

/**
 * Analyze resume with optional job description
 * @param {string} resumeText - Resume content
 * @param {string} jobDescription - Optional job description
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Analysis result
 */
export async function analyzeResume(resumeText, jobDescription = '', options = {}) {
  try {
    console.log('🔍 Analyzing resume...', { hasJD: !!jobDescription });

    // Build prompt based on whether JD is provided
    let prompt = '';
    
    if (jobDescription && jobDescription.trim().length > 0) {
      // Analysis with job description
      prompt = `You are an expert ATS (Applicant Tracking System) and resume analyst.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Perform a comprehensive resume analysis against this job description:

1. **ATS MATCH SCORE** (0-100%)
   - Calculate keyword match percentage
   - Identify missing critical keywords

2. **SKILLS GAP ANALYSIS**
   - Required skills present in resume
   - Required skills missing from resume
   - Transferable skills that apply

3. **EXPERIENCE ALIGNMENT**
   - How well experience matches requirements
   - Relevant achievements and projects

4. **RECOMMENDATIONS** (Top 5)
   - Critical improvements needed
   - Keywords to add
   - Experience to highlight
   - Sections to strengthen

Provide detailed, actionable feedback with specific examples.`;
    } else {
      // General analysis without JD
      prompt = `You are an expert resume analyst and career coach.

RESUME:
${resumeText}

Provide a comprehensive professional resume analysis:

1. **OVERALL QUALITY SCORE** (0-100%)
   - Professional presentation
   - Content quality
   - Structure effectiveness

2. **STRENGTHS**
   - What works well
   - Strong points
   - Standout qualities

3. **AREAS FOR IMPROVEMENT**
   - Weak sections
   - Missing elements
   - Formatting issues

4. **IDENTIFIED SKILLS**
   - Technical skills
   - Soft skills
   - Tools and technologies

5. **ACTIONABLE RECOMMENDATIONS** (Top 5)
   - Most impactful changes
   - Specific improvements
   - Content suggestions

Provide specific, actionable recommendations with clear examples.`;
    }

    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert resume analyst and ATS specialist. Provide detailed, actionable feedback with clear structure and specific examples.'
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
        model: response.model,
        provider: 'openai',
        hasJobDescription: !!jobDescription
      }
    };

  } catch (error) {
    console.error('❌ Resume analysis failed:', error.message);
    throw error;
  }
}

/**
 * Rephrase text with improvements
 * @param {string} text - Text to rephrase
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Rephrased text
 */
export async function rephraseText(text, options = {}) {
  try {
    console.log('✍️ Rephrasing text...');

    const prompt = `Improve and rephrase the following text to be more professional, impactful, and achievement-oriented. 
Focus on action verbs, quantifiable results, and clear communication.

ORIGINAL TEXT:
${text}

IMPROVED VERSION:`;

    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert resume writer. Rephrase text to be more professional and impactful while maintaining accuracy.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000
    });

    return {
      success: true,
      rephrased: response.content,
      metadata: {
        model: response.model,
        provider: 'openai'
      }
    };

  } catch (error) {
    console.error('❌ Text rephrase failed:', error.message);
    throw error;
  }
}

/**
 * Generate cover letter
 * @param {string} resumeText - Resume content
 * @param {string} jobDescription - Job description
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Generated cover letter
 */
export async function generateCoverLetter(resumeText, jobDescription, options = {}) {
  try {
    console.log('📧 Generating cover letter...');

    const prompt = `Based on the following resume and job description, write a professional, compelling cover letter.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Write a cover letter that:
- Highlights relevant experience and skills
- Shows enthusiasm for the role
- Demonstrates understanding of company needs
- Uses professional but engaging tone
- Is 3-4 paragraphs long
- Includes a strong opening and closing

COVER LETTER:`;

    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert cover letter writer. Create compelling, professional cover letters that highlight candidate strengths.'
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
        model: response.model,
        provider: 'openai'
      }
    };

  } catch (error) {
    console.error('❌ Cover letter generation failed:', error.message);
    throw error;
  }
}

/**
 * Generate interview questions and answers
 * @param {string} resumeText - Resume content
 * @param {string} jobDescription - Job description
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Interview Q&A
 */
export async function generateInterviewQA(resumeText, jobDescription, options = {}) {
  try {
    console.log('💬 Generating interview Q&A...');

    const prompt = `Based on the following resume and job description, generate relevant interview questions and strong answers.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Generate 8-10 likely interview questions with detailed, impressive answers that:
- Highlight relevant experience from the resume
- Address job requirements
- Use the STAR method where appropriate
- Show enthusiasm and cultural fit
- Demonstrate problem-solving abilities

Format each Q&A clearly with:
Q: [Question]
A: [Detailed Answer]

INTERVIEW PREPARATION:`;

    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert interview coach. Generate relevant questions and strong answers based on candidate background.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2500
    });

    return {
      success: true,
      interviewQA: response.content,
      metadata: {
        model: response.model,
        provider: 'openai'
      }
    };

  } catch (error) {
    console.error('❌ Interview Q&A generation failed:', error.message);
    throw error;
  }
}

// ============= HEALTH CHECK =============

/**
 * Check if AI service is available
 * @returns {Promise<Object>} Health status
 */
export async function healthCheck() {
  try {
    const client = getClient();
    if (!client) {
      return {
        available: false,
        provider: 'openai',
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
      provider: 'openai',
      model: CONFIG.model
    };

  } catch (error) {
    return {
      available: false,
      provider: 'openai',
      error: error.message
    };
  }
}

export default {
  createChatCompletion,
  analyzeResume,
  rephraseText,
  generateCoverLetter,
  generateInterviewQA,
  healthCheck
};
