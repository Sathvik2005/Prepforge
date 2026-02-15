/**
 * AI Roadmap Service - Uses Groq for Roadmap Generation
 * Clean, focused service for generating and managing learning roadmaps
 */

import * as groqService from './groqService.js';

/**
 * Generate AI-powered learning roadmap using Groq
 */
export async function generateAIRoadmap({
  goal,
  currentLevel,
  targetRole,
  timeframe,
  skills = [],
  preferredTopics = [],
  jobDescription = '',
}) {
  try {
    console.log('🗺️ Generating roadmap with Groq AI...');

    const result = await groqService.generateRoadmap({
      goal,
      currentLevel,
      targetRole,
      timeframe,
      skills,
      preferredTopics,
      jobDescription
    });

    return result;
  } catch (error) {
    console.error('Error generating roadmap:', error);
    return {
      success: false,
      error: 'Failed to generate roadmap. Please try again.',
    };
  }
}

/**
 * Refine existing roadmap based on user feedback (using Groq)
 */
export async function refineRoadmap(existingRoadmap, feedback, preferences) {
  try {
    console.log('🔧 Refining roadmap...');

    const prompt = `Refine this learning roadmap based on user feedback:

**Current Roadmap:**
${JSON.stringify(existingRoadmap, null, 2)}

**User Feedback:** ${feedback}

**Updated Preferences:**
${JSON.stringify(preferences, null, 2)}

Adjust the roadmap while maintaining JSON structure. Make it more aligned with user needs.`;

    const response = await groqService.createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert at refining learning paths based on feedback. Return valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: 0.7,
      max_tokens: 4096
    });

    // Parse refined roadmap
    let refinedRoadmap;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      refinedRoadmap = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response.content);
    } catch (parseError) {
      console.warn('⚠️ Using original roadmap due to parse error');
      refinedRoadmap = existingRoadmap;
    }

    console.log('✅ Roadmap refined');

    return {
      success: true,
      roadmap: refinedRoadmap,
      metadata: {
        provider: 'groq'
      }
    };
  } catch (error) {
    console.error('Error refining roadmap:', error);
    return {
      success: false,
      error: 'Failed to refine roadmap',
      roadmap: existingRoadmap // Return original on error
    };
  }
}

/**
 * Generate next steps based on current progress
 */
export async function generateNextSteps(roadmap, completedMilestones) {
  try {
    const completedIds = new Set(completedMilestones);
    const nextMilestone = roadmap.milestones?.find((m) => !completedIds.has(m.id));

    if (!nextMilestone) {
      return {
        success: true,
        message: 'Congratulations! You have completed all milestones.',
        nextSteps: []
      };
    }

    return {
      success: true,
      message: `Next up: ${nextMilestone.title}`,
      nextSteps: [
        `Study: ${nextMilestone.topics?.slice(0, 3).join(', ') || 'Topics listed in milestone'}`,
        `Complete resources: ${nextMilestone.resources?.length || 0} items`,
        `Estimated time: ${nextMilestone.duration || 'See milestone details'}`
      ],
      milestone: nextMilestone
    };
  } catch (error) {
    console.error('Error generating next steps:', error);
    return {
      success: false,
      error: 'Failed to generate next steps'
    };
  }
}

export default {
  generateAIRoadmap,
  refineRoadmap,
  generateNextSteps
};
