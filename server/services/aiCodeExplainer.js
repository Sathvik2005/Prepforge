import * as openrouterService from './openrouterService.js';

/**
 * Generate AI-powered code explanation
 * @param {string} code - The code to explain
 * @param {string} language - Programming language
 * @param {string} mode - Explanation mode: beginner, interview, competitive
 * @returns {Promise<Object>} Structured explanation
 */
export async function explainCode(code, language, mode = 'beginner') {
  try {
    const prompt = buildExplanationPrompt(code, language, mode);
    
    const response = await openrouterService.createChatCompletion(
      [
        {
          role: 'system',
          content: getSystemPrompt(mode),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        temperature: 0.3,
        max_tokens: 2000,
      }
    );

    const explanation = parseExplanation(response.content, mode);

    return {
      ...explanation,
      provider: 'openrouter',
      cached: false,
      mode,
    };
  } catch (error) {
    console.error('AI explanation error:', error);
    return generateFallbackExplanation(code, language, mode);
  }
}

/**
 * Build explanation prompt based on mode
 */
function buildExplanationPrompt(code, language, mode) {
  const basePrompt = `Analyze this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;

  const modePrompts = {
    beginner: `Explain this code in simple terms for a beginner. Include:
1. What the algorithm does (in plain English)
2. Step-by-step breakdown of the logic
3. Key concepts used (data structures, techniques)
4. Time and space complexity (explained simply)
5. Example walkthrough with sample input`,

    interview: `Provide an interview-ready explanation. Include:
1. Algorithm name and category (e.g., "Two Pointers", "Dynamic Programming")
2. Intuition and approach
3. Time complexity analysis with reasoning
4. Space complexity analysis with reasoning
5. Edge cases to consider
6. Potential follow-up questions
7. Alternative approaches if any`,

    competitive: `Provide a competitive programming analysis. Include:
1. Algorithm classification and pattern
2. Optimal time and space complexity
3. Critical optimizations used
4. Tricky edge cases
5. Common mistakes to avoid
6. Similar problems (if applicable)
7. Benchmarking: How it performs on large inputs`,
  };

  return basePrompt + modePrompts[mode];
}

/**
 * Get system prompt based on mode
 */
function getSystemPrompt(mode) {
  const systemPrompts = {
    beginner: `You are a patient coding instructor explaining algorithms to beginners. 
Use simple language, avoid jargon, and provide clear examples. 
Focus on building intuition rather than formal notation.
Format your response as structured JSON with these fields:
{
  "summary": "One-sentence description",
  "explanation": "Detailed explanation",
  "stepByStep": ["step 1", "step 2", ...],
  "complexity": {"time": "explanation", "space": "explanation"},
  "example": "Walkthrough with sample input",
  "keyConcepts": ["concept 1", "concept 2", ...]
}`,

    interview: `You are a technical interviewer helping candidates prepare.
Provide professional, structured explanations suitable for coding interviews.
Cover algorithmic thinking, complexity analysis, and edge cases.
Format your response as structured JSON with these fields:
{
  "summary": "Algorithm name and brief description",
  "approach": "Problem-solving approach",
  "intuition": "Key insight",
  "complexity": {"time": "analysis", "space": "analysis"},
  "edgeCases": ["case 1", "case 2", ...],
  "alternatives": ["alternative approach 1", ...],
  "followUpQuestions": ["question 1", "question 2", ...]
}`,

    competitive: `You are a competitive programming expert analyzing solutions.
Focus on optimization, pattern recognition, and performance.
Identify algorithmic patterns and provide strategic insights.
Format your response as structured JSON with these fields:
{
  "summary": "Algorithm classification",
  "pattern": "Algorithmic pattern (e.g., DP, Greedy, Graph)",
  "complexity": {"time": "Big-O", "space": "Big-O"},
  "optimizations": ["optimization 1", "optimization 2", ...],
  "edgeCases": ["critical edge case 1", ...],
  "mistakes": ["common mistake 1", ...],
  "similarProblems": ["problem 1", "problem 2", ...]
}`,
  };

  return systemPrompts[mode] || systemPrompts.beginner;
}

/**
 * Parse AI response into structured explanation
 */
function parseExplanation(content, mode) {
  try {
    // Try parsing as JSON first
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback: Extract sections from markdown
    return extractStructuredContent(content, mode);
  } catch (parseError) {
    // If JSON parsing fails, return raw content
    return {
      summary: 'Code Analysis',
      explanation: content,
      rawContent: content,
    };
  }
}

/**
 * Extract structured content from markdown response
 */
function extractStructuredContent(content, mode) {
  const sections = {
    summary: extractSection(content, ['summary', 'overview', 'description']),
    explanation: extractSection(content, ['explanation', 'details', 'breakdown']),
    complexity: extractComplexitySection(content),
  };

  if (mode === 'beginner') {
    sections.stepByStep = extractListSection(content, ['step', 'steps', 'breakdown']);
    sections.keyConcepts = extractListSection(content, ['concept', 'concepts', 'techniques']);
    sections.example = extractSection(content, ['example', 'walkthrough']);
  } else if (mode === 'interview') {
    sections.approach = extractSection(content, ['approach', 'strategy']);
    sections.intuition = extractSection(content, ['intuition', 'insight', 'key idea']);
    sections.edgeCases = extractListSection(content, ['edge case', 'edge cases']);
    sections.alternatives = extractListSection(content, ['alternative', 'alternatives']);
  } else if (mode === 'competitive') {
    sections.pattern = extractSection(content, ['pattern', 'classification', 'category']);
    sections.optimizations = extractListSection(content, ['optimization', 'optimizations']);
    sections.mistakes = extractListSection(content, ['mistake', 'mistakes', 'pitfall']);
    sections.similarProblems = extractListSection(content, ['similar', 'related problem']);
  }

  return sections;
}

/**
 * Extract text section by keywords
 */
function extractSection(content, keywords) {
  for (const keyword of keywords) {
    const regex = new RegExp(`(?:^|\\n)(?:#+)?\\s*${keyword}[:\\s]*([^\\n]+(?:\\n(?!#{1,3}\\s)[^\\n]+)*)`, 'i');
    const match = content.match(regex);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

/**
 * Extract list section
 */
function extractListSection(content, keywords) {
  for (const keyword of keywords) {
    const regex = new RegExp(`(?:^|\\n)(?:#+)?\\s*${keyword}[s]?[:\\s]*\\n([^\\n]*(?:\\n[-*]\\s+[^\\n]+)+)`, 'i');
    const match = content.match(regex);
    if (match) {
      const items = match[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
        .map(line => line.replace(/^[-*]\s+/, '').trim());
      return items;
    }
  }
  return [];
}

/**
 * Extract complexity section
 */
function extractComplexitySection(content) {
  const timeMatch = content.match(/time complexity[:\s]*([^\n]+)/i);
  const spaceMatch = content.match(/space complexity[:\s]*([^\n]+)/i);

  return {
    time: timeMatch ? timeMatch[1].trim() : 'Not specified',
    space: spaceMatch ? spaceMatch[1].trim() : 'Not specified',
  };
}

/**
 * Generate fallback explanation when AI fails
 */
function generateFallbackExplanation(code, language, mode) {
  const lineCount = code.split('\n').length;
  const hasLoops = /\b(for|while|forEach|map)\b/.test(code);
  const hasRecursion = /return\s+\w+\(/.test(code);

  const summary = `${language} code with ${lineCount} lines`;
  
  const explanation = hasRecursion
    ? 'This code uses recursion to solve the problem.'
    : hasLoops
    ? 'This code uses iterative loops to process data.'
    : 'This code performs direct computation.';

  return {
    summary,
    explanation,
    complexity: {
      time: hasRecursion ? 'Likely O(n) or higher depending on recursive calls' : hasLoops ? 'O(n) or higher' : 'O(1)',
      space: hasRecursion ? 'O(n) for call stack' : 'O(1) or O(n) depending on data structures',
    },
    fallback: true,
    reason: 'AI explanation service unavailable - using rule-based analysis',
  };
}
