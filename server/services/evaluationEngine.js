import OpenAI from 'openai';
import SkillGap from '../models/SkillGap.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * EvaluationEngine
 * Multi-metric rule-based answer evaluation
 * Detects gaps and provides transparent, explainable scores
 * 
 * NO BLACK-BOX AI SCORING - All metrics computed with clear formulas
 */

class EvaluationEngine {
  /**
   * Main evaluation pipeline
   */
  static async evaluateAnswer(question, answer, expectedComponents) {
    // Step 1: Preprocessing
    const preprocessed = this.preprocessAnswer(answer);
    
    // Step 2: Extract concepts from answer using GPT-4 (extraction only, NOT scoring)
    const extractedConcepts = await this.extractConcepts(preprocessed.text);
    
    // Step 3: Multi-metric analysis (RULE-BASED)
    const metrics = {
      clarity: this.calculateClarity(preprocessed),
      relevance: this.calculateRelevance(extractedConcepts, expectedComponents),
      depth: this.calculateDepth(preprocessed, extractedConcepts, expectedComponents),
      structure: this.calculateStructure(preprocessed),
      technicalAccuracy: this.calculateTechnicalAccuracy(extractedConcepts, expectedComponents),
    };
    
    // Step 4: Weighted aggregation
    const overallScore = this.aggregateScore(metrics);
    
    // Step 5: Gap detection
    const gaps = this.detectGaps(extractedConcepts, expectedComponents, metrics);
    
    // Step 6: Feedback generation
    const feedback = this.generateFeedback(metrics, gaps, expectedComponents);
    
    return {
      overallScore,
      metrics,
      gaps,
      feedback,
      extractedConcepts,
      followUpNeeded: this.shouldFollowUp(metrics),
    };
  }
  
  /**
   * Preprocessing: Tokenize, clean, analyze structure
   */
  static preprocessAnswer(answer) {
    const text = answer.toLowerCase().trim();
    
    // Tokenization
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    // Filler word detection
    const fillerWords = ['um', 'uh', 'like', 'kinda', 'sorta', 'you know', 'basically'];
    const fillerCount = fillerWords.reduce((count, filler) =>
      count + (text.match(new RegExp(`\\b${filler}\\b`, 'g')) || []).length, 0);
    
    // Structure indicators
    const hasIntro = sentences.length > 0 && (
      sentences[0].includes('let me explain') ||
      sentences[0].includes('essentially') ||
      sentences[0].includes('in short') ||
      sentences[0].length > 10
    );
    
    const hasConclusion = sentences.length > 1 && (
      sentences[sentences.length - 1].includes('so') ||
      sentences[sentences.length - 1].includes('therefore') ||
      sentences[sentences.length - 1].includes('in summary') ||
      sentences[sentences.length - 1].includes('overall')
    );
    
    const hasExample = text.includes('example') || text.includes('for instance') ||
                       text.includes('such as') || text.includes('like when');
    
    const hasComparison = text.includes('compared to') || text.includes('versus') ||
                          text.includes('while') || text.includes('whereas');
    
    const hasTradeOff = text.includes('trade') || text.includes('however') ||
                        text.includes('but') || text.includes('on the other hand');
    
    return {
      text,
      sentences,
      words,
      sentenceCount: sentences.length,
      wordCount: words.length,
      fillerCount,
      hasIntro,
      hasConclusion,
      hasExample,
      hasComparison,
      hasTradeOff,
      avgSentenceLength: words.length / Math.max(sentences.length, 1),
    };
  }
  
  /**
   * Extract concepts using GPT-4 (EXTRACTION ONLY, not evaluation)
   */
  static async extractConcepts(answerText) {
    const prompt = `Extract technical concepts, terms, and key ideas from this interview answer.

Answer: "${answerText}"

Return a JSON object with:
{
  "concepts": ["concept1", "concept2"],
  "technicalTerms": ["term1", "term2"],
  "examples": ["example1"],
  "comparisons": ["comparison1"]
}

Only extract, do NOT evaluate quality.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You extract concepts from text. You do NOT evaluate or judge quality.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });
      
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Concept extraction failed:', error);
      return {
        concepts: [],
        technicalTerms: [],
        examples: [],
        comparisons: [],
      };
    }
  }
  
  /**
   * METRIC 1: Clarity (0-100)
   * Formula: Based on sentence structure, filler words, readability
   */
  static calculateClarity(preprocessed) {
    let score = 100;
    
    // Penalize excessive filler words
    const fillerPenalty = Math.min(preprocessed.fillerCount * 5, 30);
    score -= fillerPenalty;
    
    // Penalize very short answers
    if (preprocessed.wordCount < 20) {
      score -= 40;
    } else if (preprocessed.wordCount < 50) {
      score -= 20;
    }
    
    // Penalize very long, rambling sentences
    if (preprocessed.avgSentenceLength > 30) {
      score -= 15;
    }
    
    // Reward clear structure
    if (preprocessed.sentenceCount >= 3 && preprocessed.sentenceCount <= 8) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * METRIC 2: Relevance (0-100)
   * Formula: Concept overlap ratio
   */
  static calculateRelevance(extractedConcepts, expectedComponents) {
    if (!expectedComponents || !expectedComponents.requiredConcepts) {
      return 70; // Default if no expectations
    }
    
    const required = expectedComponents.requiredConcepts || [];
    const optional = expectedComponents.optionalConcepts || [];
    const mentioned = extractedConcepts.concepts || [];
    
    if (required.length === 0) return 70;
    
    // Calculate overlap
    const requiredMatches = required.filter(r =>
      mentioned.some(m => m.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(m.toLowerCase()))
    );
    
    const optionalMatches = optional.filter(o =>
      mentioned.some(m => m.toLowerCase().includes(o.toLowerCase()))
    );
    
    // Relevance = (required matches / total required) * 80 + (optional matches / total optional) * 20
    const requiredScore = (requiredMatches.length / required.length) * 80;
    const optionalScore = optional.length > 0 ? (optionalMatches.length / optional.length) * 20 : 20;
    
    return Math.round(requiredScore + optionalScore);
  }
  
  /**
   * METRIC 3: Depth (0-100)
   * Formula: Presence of examples, use cases, comparisons, trade-offs
   */
  static calculateDepth(preprocessed, extractedConcepts, expectedComponents) {
    let score = 0;
    
    // Base points for structure
    if (preprocessed.hasExample) score += 25;
    if (preprocessed.hasComparison) score += 20;
    if (preprocessed.hasTradeOff) score += 25;
    
    // Points for detail level
    if (preprocessed.wordCount > 100) score += 15;
    if (preprocessed.wordCount > 150) score += 10;
    
    // Points for depth indicators
    const depthIndicators = expectedComponents?.depthIndicators || [];
    const indicatorMatches = depthIndicators.filter(indicator =>
      preprocessed.text.includes(indicator.toLowerCase())
    );
    score += Math.min(indicatorMatches.length * 5, 25);
    
    // Penalize if expected structure is missing
    if (expectedComponents?.idealStructure) {
      const ideal = expectedComponents.idealStructure;
      if (ideal.hasExample && !preprocessed.hasExample) score -= 10;
      if (ideal.hasTradeOff && !preprocessed.hasTradeOff) score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * METRIC 4: Structure (0-100)
   * Formula: Intro, logical flow, conclusion presence
   */
  static calculateStructure(preprocessed) {
    let score = 40; // Base score
    
    if (preprocessed.hasIntro) score += 20;
    if (preprocessed.hasConclusion) score += 20;
    
    // Logical flow indicators
    const flowWords = ['first', 'second', 'then', 'next', 'finally', 'because', 'therefore', 'so'];
    const flowCount = flowWords.reduce((count, word) =>
      count + (preprocessed.text.includes(word) ? 1 : 0), 0);
    
    score += Math.min(flowCount * 5, 20);
    
    return Math.min(100, score);
  }
  
  /**
   * METRIC 5: Technical Accuracy (0-100)
   * Formula: Correct concepts / Total concepts mentioned
   */
  static calculateTechnicalAccuracy(extractedConcepts, expectedComponents) {
    const mentioned = extractedConcepts.concepts || [];
    const required = expectedComponents?.requiredConcepts || [];
    const optional = expectedComponents?.optionalConcepts || [];
    const allExpected = [...required, ...optional];
    
    if (mentioned.length === 0) return 0;
    if (allExpected.length === 0) return 80; // Default if no expectations
    
    // Count correct concepts
    const correct = mentioned.filter(m =>
      allExpected.some(e => m.toLowerCase().includes(e.toLowerCase()) || e.toLowerCase().includes(m.toLowerCase()))
    );
    
    // Accuracy = (correct / mentioned) * 100
    const accuracy = (correct.length / mentioned.length) * 100;
    
    return Math.round(accuracy);
  }
  
  /**
   * Weighted aggregation
   * Formula: clarity×0.20 + relevance×0.25 + depth×0.25 + structure×0.15 + accuracy×0.15
   */
  static aggregateScore(metrics) {
    const weights = {
      clarity: 0.20,
      relevance: 0.25,
      depth: 0.25,
      structure: 0.15,
      technicalAccuracy: 0.15,
    };
    
    const score = 
      (metrics.clarity * weights.clarity) +
      (metrics.relevance * weights.relevance) +
      (metrics.depth * weights.depth) +
      (metrics.structure * weights.structure) +
      (metrics.technicalAccuracy * weights.technicalAccuracy);
    
    return Math.round(score);
  }
  
  /**
   * Gap detection
   * Identifies missing knowledge vs weak explanation
   */
  static detectGaps(extractedConcepts, expectedComponents, metrics) {
    const gaps = [];
    
    if (!expectedComponents) return gaps;
    
    const required = expectedComponents.requiredConcepts || [];
    const mentioned = extractedConcepts.concepts || [];
    
    // Knowledge gaps: Required concept not mentioned at all
    const missingConcepts = required.filter(r =>
      !mentioned.some(m => m.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(m.toLowerCase()))
    );
    
    for (const concept of missingConcepts) {
      gaps.push({
        type: 'knowledge-gap',
        skill: concept,
        severity: 'high',
        evidence: 'Concept not mentioned in answer',
      });
    }
    
    // Explanation gaps: Mentioned but score is low
    if (metrics.relevance >= 60 && metrics.depth < 50) {
      gaps.push({
        type: 'explanation-gap',
        skill: 'articulation',
        severity: 'medium',
        evidence: 'Answer lacks depth and examples despite relevant content',
      });
    }
    
    // Depth gaps: Structure is there but lacks substance
    if (metrics.structure >= 70 && metrics.depth < 50) {
      gaps.push({
        type: 'depth-gap',
        skill: 'detailed understanding',
        severity: 'medium',
        evidence: 'Well-structured but superficial explanation',
      });
    }
    
    return gaps;
  }
  
  /**
   * Generate actionable feedback
   */
  static generateFeedback(metrics, gaps, expectedComponents) {
    const strengths = [];
    const weaknesses = [];
    const suggestions = [];
    
    // Clarity feedback
    if (metrics.clarity >= 80) {
      strengths.push('Clear and concise communication');
    } else if (metrics.clarity < 60) {
      weaknesses.push('Answer lacks clarity');
      suggestions.push('Structure your answer with clear sentences. Avoid filler words like "um", "uh", "like".');
    }
    
    // Relevance feedback
    if (metrics.relevance >= 80) {
      strengths.push('Directly addressed the question');
    } else if (metrics.relevance < 60) {
      weaknesses.push('Answer did not fully address the question');
      suggestions.push(`Make sure to cover: ${expectedComponents?.requiredConcepts?.join(', ') || 'key concepts'}`);
    }
    
    // Depth feedback
    if (metrics.depth >= 80) {
      strengths.push('Demonstrated deep understanding with examples');
    } else if (metrics.depth < 60) {
      weaknesses.push('Explanation lacked depth');
      suggestions.push('Include specific examples, use cases, or real-world applications.');
    }
    
    // Structure feedback
    if (metrics.structure >= 80) {
      strengths.push('Well-organized answer with logical flow');
    } else if (metrics.structure < 60) {
      weaknesses.push('Answer was disorganized');
      suggestions.push('Structure your answer: introduce the concept, explain with examples, conclude with key takeaways.');
    }
    
    // Technical accuracy feedback
    if (metrics.technicalAccuracy >= 80) {
      strengths.push('Technically accurate explanation');
    } else if (metrics.technicalAccuracy < 60) {
      weaknesses.push('Some technical inaccuracies detected');
      suggestions.push('Review core concepts and ensure terminology is used correctly.');
    }
    
    // Gap-specific suggestions
    for (const gap of gaps) {
      if (gap.type === 'knowledge-gap') {
        suggestions.push(`Study the concept: ${gap.skill}`);
      } else if (gap.type === 'explanation-gap') {
        suggestions.push('Practice explaining concepts out loud before the interview');
      }
    }
    
    return {
      strengths,
      weaknesses,
      suggestions,
      scoreBreakdown: {
        clarity: `${metrics.clarity}/100`,
        relevance: `${metrics.relevance}/100`,
        depth: `${metrics.depth}/100`,
        structure: `${metrics.structure}/100`,
        technicalAccuracy: `${metrics.technicalAccuracy}/100`,
      },
    };
  }
  
  /**
   * Determine if follow-up question is needed
   */
  static shouldFollowUp(metrics) {
    // Follow up if answer is weak on key metrics
    return (
      metrics.relevance < 50 ||
      metrics.depth < 60 ||
      metrics.technicalAccuracy < 50
    );
  }
  
  /**
   * Create persistent skill gap records
   */
  static async createGapRecords(userId, resumeId, jobDescriptionId, interviewSessionId, detectedGaps) {
    const gapRecords = [];
    
    for (const gap of detectedGaps) {
      const existing = await SkillGap.findOne({
        userId,
        skill: gap.skill,
        gapType: gap.type,
        status: { $in: ['identified', 'in-progress'] },
      });
      
      if (existing) {
        // Update existing gap
        existing.evidence.fromInterview = existing.evidence.fromInterview || {};
        existing.evidence.fromInterview.asked = true;
        existing.evidence.fromInterview.feedback = gap.evidence;
        await existing.save();
        gapRecords.push(existing);
      } else {
        // Create new gap
        const newGap = new SkillGap({
          userId,
          resumeId,
          jobDescriptionId,
          interviewSessionId,
          skill: gap.skill,
          gapType: gap.type,
          severity: gap.severity,
          evidence: {
            fromInterview: {
              asked: true,
              feedback: gap.evidence,
            },
          },
          analysis: {
            detectedAt: new Date(),
            detectionMethod: 'interview-evaluation',
            reasoning: gap.evidence,
          },
          status: 'identified',
        });
        
        await newGap.save();
        gapRecords.push(newGap);
      }
    }
    
    return gapRecords;
  }
}

export default EvaluationEngine;
