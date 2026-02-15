/**
 * OpenRouter AI Service - For Interview & General AI Features
 * Flexible AI service with access to multiple models
 */

import axios from 'axios';

// ============= CONFIGURATION =============

const CONFIG = {
  timeout: 30000,        // 30 seconds
  maxRetries: 1,         // Single retry
  retryDelay: 1000,      // 1 second delay
  model: 'meta-llama/llama-3.3-70b-instruct', // Default model
  temperature: 0.7,
  maxTokens: 2000,
  baseURL: 'https://openrouter.ai/api/v1'
};

// ============= HELPER FUNCTIONS =============

/**
 * Check if OpenRouter is configured
 */
function isConfigured() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not configured');
    return false;
  }

  if (!process.env.OPENROUTER_API_KEY.startsWith('sk-or-v1-')) {
    console.error('❌ Invalid OPENROUTER_API_KEY format');
    return false;
  }

  console.log('✅ OpenRouter service initialized for Interview features');
  return true;
}

// Initialize on module load
isConfigured();

// ============= CORE FUNCTION =============

/**
 * Create chat completion with OpenRouter
 * @param {Array} messages - Chat messages
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} AI response
 */
export async function createChatCompletion(messages, options = {}) {
  if (!isConfigured()) {
    throw new Error('OpenRouter AI service unavailable - API key not configured');
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

  console.log(`🔄 OpenRouter AI Request: ${config.model} (temp: ${config.temperature}, max_tokens: ${config.max_tokens})`);

  let lastError = null;
  const maxAttempts = CONFIG.maxRetries + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`📡 OpenRouter Attempt ${attempt}/${maxAttempts}...`);

      const startTime = Date.now();
      
      // Make API request
      const response = await Promise.race([
        axios.post(
          `${CONFIG.baseURL}/chat/completions`,
          config,
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
              'X-Title': 'PrepWiser Interview Platform'
            },
            timeout: CONFIG.timeout
          }
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OpenRouter request timeout')), CONFIG.timeout)
        )
      ]);

      const duration = Date.now() - startTime;
      console.log(`✅ OpenRouter response received in ${duration}ms`);

      // Extract content
      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenRouter');
      }

      return {
        success: true,
        content: content.trim(),
        model: response.data.model,
        usage: response.data.usage,
        provider: 'openrouter',
        metadata: {
          provider: 'openrouter',
          model: response.data.model,
          cached: false,
          degradedMode: false
        },
        attempt
      };

    } catch (error) {
      lastError = error;
      const errorMsg = error.response?.data?.error?.message || error.message;
      console.error(`❌ OpenRouter Attempt ${attempt} failed:`, errorMsg);

      // Check for rate limit
      if (error.response?.status === 429 || errorMsg?.includes('rate limit')) {
        console.error('⚠️ OpenRouter rate limit exceeded');
        throw new Error('OpenRouter AI rate limit exceeded - please try again in a moment');
      }

      // Check for authentication error
      if (error.response?.status === 401 || errorMsg?.includes('authentication')) {
        console.error('⚠️ OpenRouter authentication failed');
        throw new Error('OpenRouter AI authentication failed - invalid API key');
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
  console.error('❌ All OpenRouter attempts failed:', lastError?.message);
  throw new Error(`OpenRouter request failed after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
}

// ============= INTERVIEW QUESTION GENERATION =============

/**
 * Generate interview question with OpenRouter
 * @param {Object} params - Question parameters
 * @returns {Promise<Object>} Generated question
 */
export async function generateInterviewQuestion(params) {
  try {
    console.log('💬 Generating interview question with OpenRouter...');

    const { role, difficulty, topic, style } = params;

    const prompt = `Generate a ${difficulty || 'medium'} difficulty ${style || 'technical'} interview question for a ${role} position, focusing on ${topic}.

Include:
1. Question text
2. Expected answer approach
3. Follow-up questions (2-3)
4. Evaluation criteria

Return as JSON:
{
  "question": "...",
  "approach": "...",
  "followUps": ["...", "..."],
  "criteria": ["...", "..."]
}`;

    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert technical interviewer. Generate realistic, challenging interview questions. Always return valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: 0.8,
      max_tokens: 1500
    });

    // Parse response
    let question;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      question = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response.content);
    } catch (parseError) {
      question = {
        question: response.content,
        approach: 'Think through the problem systematically',
        followUps: [],
        criteria: []
      };
    }

    console.log('✅ Interview question generated with OpenRouter');

    return {
      success: true,
      question,
      metadata: {
        provider: 'openrouter',
        model: CONFIG.model
      }
    };

  } catch (error) {
    console.error('❌ Question generation error:', error.message);
    throw error;
  }
}

// ============= INTERVIEW FEEDBACK =============

/**
 * Generate interview feedback with OpenRouter
 * @param {Object} params - Feedback parameters
 * @returns {Promise<Object>} Generated feedback
 */
export async function generateInterviewFeedback(params) {
  try {
    console.log('📝 Generating interview feedback with OpenRouter...');

    const { question, answer, duration, role } = params;

    const prompt = `Provide detailed feedback for this interview response:

**Question:** ${question}
**Candidate's Answer:** ${answer}
**Time Taken:** ${duration || 'Not specified'}
**Role:** ${role}

Provide:
1. **Strengths** - What was done well
2. **Areas for Improvement** - Specific suggestions
3. **Score** - Overall rating (1-10)
4. **Recommendations** - Next steps

Return as JSON:
{
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "score": 8,
  "recommendations": ["...", "..."],
  "summary": "..."
}`;

    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert interview evaluator. Provide constructive, specific feedback. Always return valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: 0.6,
      max_tokens: 2000
    });

    // Parse response
    let feedback;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      feedback = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response.content);
    } catch (parseError) {
      feedback = {
        strengths: ['Attempted to answer the question'],
        improvements: ['Could provide more detail'],
        score: 6,
        recommendations: ['Practice more on this topic'],
        summary: response.content.substring(0, 200)
      };
    }

    console.log('✅ Interview feedback generated with OpenRouter');

    return {
      success: true,
      feedback,
      metadata: {
        provider: 'openrouter',
        model: CONFIG.model
      }
    };

  } catch (error) {
    console.error('❌ Feedback generation error:', error.message);
    throw error;
  }
}

// ============= HEALTH CHECK =============

/**
 * Check if OpenRouter service is available
 * @returns {Promise<Object>} Health status
 */
export async function healthCheck() {
  try {
    if (!isConfigured()) {
      return {
        available: false,
        provider: 'openrouter',
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
      provider: 'openrouter',
      model: CONFIG.model
    };

  } catch (error) {
    return {
      available: false,
      provider: 'openrouter',
      error: error.message
    };
  }
}

export default {
  createChatCompletion,
  generateInterviewQuestion,
  generateInterviewFeedback,
  healthCheck
};
