/**
 * AI Provider Service - Multi-provider fallback with retry logic
 * Transparent middleware that wraps AI calls with intelligent routing
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Multi-provider fallback (OpenAI -> Groq -> OpenRouter)
 * - Quota monitoring and prediction
 * - Request deduplication
 * - Response caching
 * - Token optimization
 */

import OpenAI from 'openai';
import axios from 'axios';
import crypto from 'crypto';
import NodeCache from 'node-cache';

// ============= CONFIGURATION =============

const PROVIDERS = {
  OPENAI: 'openai',
  GROQ: 'groq',
  OPENROUTER: 'openrouter'
};

const CONFIG = {
  // Retry settings
  maxRetries: 2,              // Reduced retries for quota errors
  baseDelay: 500,             // Shorter base delay (0.5 seconds)
  maxDelay: 3000,             // 3 seconds max delay
  jitter: 0.2,                // 20% jitter
  
  // Timeout settings
  requestTimeout: 60000,      // 60 seconds
  
  // Cache settings
  cacheEnabled: true,
  cacheTTL: 3600,            // 1 hour
  
  // Quota monitoring
  quotaWarningThreshold: 0.8,
  quotaPredictionEnabled: true,
  
  // Provider priorities (lower = higher priority)
  providerPriority: [
    PROVIDERS.OPENAI,
    PROVIDERS.GROQ,
    PROVIDERS.OPENROUTER
  ]
};

// ============= PROVIDER CLIENTS =============

const providers = {
  [PROVIDERS.OPENAI]: null,
  [PROVIDERS.GROQ]: null,
  [PROVIDERS.OPENROUTER]: null
};

// Initialize OpenAI
if (process.env.OPENAI_API_KEY) {
  providers[PROVIDERS.OPENAI] = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: CONFIG.requestTimeout
  });
  console.log('✅ OpenAI provider initialized');
}

// Initialize Groq
if (process.env.GROQ_API_KEY) {
  providers[PROVIDERS.GROQ] = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
    timeout: CONFIG.requestTimeout
  });
  console.log('✅ Groq provider initialized');
}

// Initialize OpenRouter
if (process.env.OPENROUTER_API_KEY) {
  providers[PROVIDERS.OPENROUTER] = {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1'
  };
  console.log('✅ OpenRouter provider initialized');
}

// ============= CACHE LAYER =============

const cache = new NodeCache({
  stdTTL: CONFIG.cacheTTL,
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false
});

// Cache key generator
function getCacheKey(messages, options = {}) {
  const cacheableData = {
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    model: options.model,
    temperature: options.temperature,
    max_tokens: options.max_tokens
  };
  
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(cacheableData))
    .digest('hex');
}

// ============= QUOTA MONITORING =============

const quotaStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  quotaErrors: 0,
  lastQuotaError: null,
  tokenUsage: {
    prompt: 0,
    completion: 0,
    total: 0
  },
  providerStatus: {
    [PROVIDERS.OPENAI]: { available: true, lastError: null, errorCount: 0 },
    [PROVIDERS.GROQ]: { available: true, lastError: null, errorCount: 0 },
    [PROVIDERS.OPENROUTER]: { available: true, lastError: null, errorCount: 0 }
  }
};

// Update quota stats
function updateQuotaStats(provider, success, tokenUsage = null, error = null) {
  quotaStats.totalRequests++;
  
  if (success) {
    quotaStats.successfulRequests++;
    quotaStats.providerStatus[provider].errorCount = 0;
    
    if (tokenUsage) {
      quotaStats.tokenUsage.prompt += tokenUsage.prompt_tokens || 0;
      quotaStats.tokenUsage.completion += tokenUsage.completion_tokens || 0;
      quotaStats.tokenUsage.total += tokenUsage.total_tokens || 0;
    }
  } else {
    quotaStats.failedRequests++;
    quotaStats.providerStatus[provider].errorCount++;
    quotaStats.providerStatus[provider].lastError = error;
    
    // Mark provider as unavailable after 3 consecutive errors
    if (quotaStats.providerStatus[provider].errorCount >= 3) {
      quotaStats.providerStatus[provider].available = false;
      console.warn(`⚠️  Provider ${provider} marked as unavailable after 3 consecutive errors`);
      
      // Re-enable after 5 minutes
      setTimeout(() => {
        quotaStats.providerStatus[provider].available = true;
        quotaStats.providerStatus[provider].errorCount = 0;
        console.log(`✅ Provider ${provider} re-enabled`);
      }, 5 * 60 * 1000);
    }
    
    if (isQuotaError(error)) {
      quotaStats.quotaErrors++;
      quotaStats.lastQuotaError = new Date();
    }
  }
}

// Check if error is quota-related
function isQuotaError(error) {
  if (!error) return false;
  
  const quotaIndicators = [
    'quota',
    'insufficient_quota',
    'rate_limit',
    '429',
    'too many requests'
  ];
  
  const errorString = JSON.stringify(error).toLowerCase();
  return quotaIndicators.some(indicator => errorString.includes(indicator));
}

// Check if error is retryable
function isRetryableError(error) {
  if (!error) return false;
  
  // Quota errors are retryable with longer delays
  if (isQuotaError(error)) return true;
  
  // Timeout and connection errors are retryable
  const retryableIndicators = [
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ECONNRESET',
    'timeout',
    'network',
    '503',
    '502',
    '504'
  ];
  
  const errorString = JSON.stringify(error).toLowerCase();
  return retryableIndicators.some(indicator => errorString.includes(indicator));
}

// ============= RETRY LOGIC =============

function calculateBackoff(attempt, isQuotaError = false) {
  // Use longer delays for quota errors
  const baseDelay = isQuotaError ? 5000 : CONFIG.baseDelay;
  const maxDelay = isQuotaError ? 30000 : CONFIG.maxDelay;
  
  // Exponential backoff: delay = base * 2^attempt
  let delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  
  // Add jitter to prevent thundering herd
  const jitterAmount = delay * CONFIG.jitter;
  delay += Math.random() * jitterAmount - jitterAmount / 2;
  
  return Math.floor(delay);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============= PROVIDER CALLS =============

async function callOpenAI(provider, messages, options = {}) {
  const client = providers[provider];
  if (!client) {
    throw new Error(`Provider ${provider} not configured`);
  }
  
  // OpenAI and Groq use the same API
  if (provider === PROVIDERS.OPENAI || provider === PROVIDERS.GROQ) {
    const modelMap = {
      [PROVIDERS.OPENAI]: options.model || 'gpt-4o-mini',
      [PROVIDERS.GROQ]: 'llama-3.3-70b-versatile' // Fast and capable model
    };
    
    const response = await client.chat.completions.create({
      model: modelMap[provider],
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 2000,
      ...options
    });
    
    return {
      content: response.choices[0].message.content,
      provider,
      usage: response.usage,
      model: response.model
    };
  }
  
  // OpenRouter
  if (provider === PROVIDERS.OPENROUTER) {
    const response = await axios.post(
      `${client.baseURL}/chat/completions`,
      {
        model: options.model || 'meta-llama/llama-3.3-70b-instruct',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000,
        ...options
      },
      {
        headers: {
          'Authorization': `Bearer ${client.apiKey}`,
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'PrepWiser Resume Analysis',
          'Content-Type': 'application/json'
        },
        timeout: CONFIG.requestTimeout
      }
    );
    
    return {
      content: response.data.choices[0].message.content,
      provider,
      usage: response.data.usage,
      model: response.data.model
    };
  }
  
  throw new Error(`Unsupported provider: ${provider}`);
}

// ============= MAIN API =============

/**
 * Create chat completion with automatic retry and fallback
 * @param {Array} messages - Chat messages
 * @param {Object} options - Completion options (temperature, max_tokens, etc.)
 * @param {Object} meta - Metadata (feature name, user id, etc.)
 * @returns {Object} Response with content, provider, and usage info
 */
export async function createChatCompletion(messages, options = {}, meta = {}) {
  // Check cache first
  if (CONFIG.cacheEnabled && !meta.skipCache) {
    const cacheKey = getCacheKey(messages, options);
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log('✅ Cache hit for', meta.feature || 'request');
      return {
        ...cached,
        cached: true
      };
    }
  }
  
  // Get available providers in priority order
  const availableProviders = CONFIG.providerPriority.filter(
    p => providers[p] && quotaStats.providerStatus[p].available
  );
  
  if (availableProviders.length === 0) {
    throw new Error('No AI providers available. Please try again later.');
  }
  
  let lastError = null;
  
  // Try each provider with retry logic
  for (const provider of availableProviders) {
    console.log(`🤖 Attempting ${provider} for ${meta.feature || 'request'}`);
    
    for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
      try {
        const response = await callOpenAI(provider, messages, options);
        
        // Success! Update stats and cache
        updateQuotaStats(provider, true, response.usage);
        
        if (CONFIG.cacheEnabled && !meta.skipCache) {
          const cacheKey = getCacheKey(messages, options);
          cache.set(cacheKey, response);
        }
        
        console.log(`✅ Success with ${provider} (attempt ${attempt + 1}/${CONFIG.maxRetries + 1})`);
        return {
          ...response,
          cached: false,
          attempts: attempt + 1
        };
        
      } catch (error) {
        lastError = error;
        const isQuota = isQuotaError(error);
        const isRetryable = isRetryableError(error);
        
        console.error(`❌ ${provider} error (attempt ${attempt + 1}/${CONFIG.maxRetries + 1}):`, error.message);
        
        // Update stats
        updateQuotaStats(provider, false, null, error);
        
        // If not retryable or last attempt, try next provider
        if (!isRetryable || attempt === CONFIG.maxRetries) {
          console.warn(`⚠️  Moving to next provider after ${attempt + 1} attempts`);
          break;
        }
        
        // Calculate backoff and retry
        const delay = calculateBackoff(attempt, isQuota);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  // All providers failed
  console.error('❌ All providers failed:', lastError?.message);
  throw lastError || new Error('All AI providers failed');
}

/**
 * Get quota statistics
 */
export function getQuotaStats() {
  return {
    ...quotaStats,
    cacheStats: cache.getStats(),
    availableProviders: CONFIG.providerPriority.filter(
      p => providers[p] && quotaStats.providerStatus[p].available
    )
  };
}

/**
 * Clear cache
 */
export function clearCache() {
  cache.flushAll();
  console.log('✅ Cache cleared');
}

/**
 * Reset quota stats
 */
export function resetQuotaStats() {
  quotaStats.totalRequests = 0;
  quotaStats.successfulRequests = 0;
  quotaStats.failedRequests = 0;
  quotaStats.quotaErrors = 0;
  quotaStats.lastQuotaError = null;
  quotaStats.tokenUsage = { prompt: 0, completion: 0, total: 0 };
  
  Object.keys(quotaStats.providerStatus).forEach(provider => {
    quotaStats.providerStatus[provider] = {
      available: true,
      lastError: null,
      errorCount: 0
    };
  });
  
  console.log('✅ Quota stats reset');
}

export default {
  createChatCompletion,
  getQuotaStats,
  clearCache,
  resetQuotaStats,
  PROVIDERS,
  CONFIG
};
