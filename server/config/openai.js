/**
 * OpenAI API Configuration
 * Wrapper for OpenAI GPT models
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

let openaiClient = null;

/**
 * Initialize OpenAI client
 */
export const initializeOpenAI = () => {
  if (openaiClient) {
    return openaiClient;
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️  OpenAI API key not configured. AI features will use mock responses.');
      return null;
    }

    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    console.log('✅ OpenAI API initialized');
    return openaiClient;

  } catch (error) {
    console.error('❌ OpenAI initialization error:', error.message);
    console.warn('⚠️  AI features will use mock responses');
    return null;
  }
};

/**
 * Generate chat completion
 * @param {Array} messages - Array of message objects {role, content}
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Generated text
 */
export const generateChatCompletion = async (messages, options = {}) => {
  try {
    if (!openaiClient) {
      throw new Error('OpenAI not initialized');
    }

    const completion = await openaiClient.chat.completions.create({
      model: options.model || 'gpt-4-turbo-preview',
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      top_p: options.topP || 1,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0
    });

    return completion.choices[0].message.content;

  } catch (error) {
    throw new Error(`OpenAI completion failed: ${error.message}`);
  }
};

/**
 * Generate interview question using GPT-4
 * @param {Object} params - Question parameters
 * @returns {Promise<Object>} Generated question
 */
export const generateInterviewQuestionGPT = async (params) => {
  const { role, difficulty, format, topic } = params;

  const prompt = `Generate a ${difficulty} difficulty ${format} interview question for a ${role} role focusing on ${topic}.

Return a JSON object with the following structure:
{
  "title": "Brief question title",
  "description": "Detailed question description",
  "hints": ["hint1", "hint2", "hint3"],
  "sampleInput": "example input (if applicable)",
  "sampleOutput": "example output (if applicable)",
  "constraints": ["constraint1", "constraint2"],
  "evaluationCriteria": {
    "correctness": 40,
    "codeQuality": 20,
    "timeComplexity": 20,
    "edgeCases": 20
  },
  "timeLimit": 30
}`;

  const messages = [
    {
      role: 'system',
      content: 'You are an expert technical interviewer. Generate realistic, high-quality interview questions.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await generateChatCompletion(messages, {
    temperature: 0.8,
    maxTokens: 1500
  });

  return JSON.parse(response);
};

/**
 * Generate interview feedback using GPT-4
 * @param {Object} params - Feedback parameters
 * @returns {Promise<Object>} Generated feedback
 */
export const generateInterviewFeedbackGPT = async (params) => {
  const { questionDescription, userSolution, transcript, format } = params;

  const prompt = `Analyze this interview performance and provide detailed feedback.

**Question:** ${questionDescription}

**User's Solution:**
\`\`\`
${userSolution || 'No code provided'}
\`\`\`

**Interview Transcript:**
${transcript || 'No transcript available'}

**Question Format:** ${format}

Provide a comprehensive evaluation in JSON format:
{
  "overallScore": 0-100,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "codeAnalysis": {
    "correctness": 0-100,
    "timeComplexity": "O(n) analysis",
    "spaceComplexity": "O(1) analysis",
    "codeQuality": 0-100,
    "edgeCaseHandling": 0-100
  },
  "communicationAnalysis": {
    "clarity": 0-100,
    "structure": 0-100,
    "technicalDepth": 0-100
  },
  "improvements": ["improvement1", "improvement2"],
  "nextSteps": ["step1", "step2"]
}`;

  const messages = [
    {
      role: 'system',
      content: 'You are an experienced technical interviewer providing constructive feedback.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await generateChatCompletion(messages, {
    temperature: 0.5,
    maxTokens: 2000
  });

  return JSON.parse(response);
};

/**
 * Generate study companion response
 * @param {Object} params - Query parameters
 * @returns {Promise<string>} AI response
 */
export const generateStudyCompanionResponse = async (params) => {
  const { query, context, userLevel } = params;

  const prompt = `You are an AI study companion helping a ${userLevel || 'intermediate'} developer.

**User Question:** ${query}

**Context:** ${context || 'General programming question'}

Provide a helpful, concise response that:
1. Answers the question directly
2. Provides a code example if relevant
3. Suggests next steps
4. Keeps it under 300 words

Your response:`;

  const messages = [
    {
      role: 'system',
      content: 'You are a patient, knowledgeable programming tutor focused on practical learning.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await generateChatCompletion(messages, {
    temperature: 0.7,
    maxTokens: 800
  });

  return response;
};

/**
 * Analyze code for mistake patterns
 * @param {Object} params - Analysis parameters
 * @returns {Promise<Object>} Analysis result
 */
export const analyzeCodeMistake = async (params) => {
  const { code, expectedApproach, questionTopic } = params;

  const prompt = `Analyze this code submission for a ${questionTopic} problem and identify mistake patterns.

**Code:**
\`\`\`
${code}
\`\`\`

**Expected Approach:** ${expectedApproach}

Identify and categorize the mistakes in JSON format:
{
  "mistakeType": "conceptual|logical|implementation|edge-case|optimization|syntax",
  "category": "specific subcategory",
  "rootCause": "explanation of why this mistake occurred",
  "commonPattern": "is this a recurring pattern?",
  "learningGap": "what concept needs reinforcement?",
  "recommendedActions": ["action1", "action2"]
}`;

  const messages = [
    {
      role: 'system',
      content: 'You are an expert code reviewer specializing in educational feedback.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await generateChatCompletion(messages, {
    temperature: 0.3,
    maxTokens: 1000
  });

  return JSON.parse(response);
};

/**
 * Check if OpenAI is enabled
 * @returns {boolean}
 */
export const isOpenAIEnabled = () => {
  return openaiClient !== null;
};

export default {
  initializeOpenAI,
  generateChatCompletion,
  generateInterviewQuestionGPT,
  generateInterviewFeedbackGPT,
  generateStudyCompanionResponse,
  analyzeCodeMistake,
  isOpenAIEnabled
};
