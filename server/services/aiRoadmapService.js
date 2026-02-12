import { createChatCompletion } from './aiProvider.js';

/**
 * Generate AI-powered learning roadmap
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
  const prompt = buildRoadmapPrompt({
    goal,
    currentLevel,
    targetRole,
    timeframe,
    skills,
    preferredTopics,
    jobDescription,
  });

  try {
    const systemPrompt = `You are an expert career counselor and learning path designer with deep expertise in:
- Technical skill development and career progression
- Industry requirements and job market trends
- Personalized learning strategies
- Time management and goal setting

Generate comprehensive, actionable learning roadmaps that are:
- Structured and easy to follow
- Tailored to the user's current level and goals
- Realistic and achievable within the given timeframe
- Rich with quality resources and practical projects
- Aligned with industry standards and job requirements`;

    const response = await createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.7,
      max_tokens: 4096,
    });

    const roadmap = parseRoadmapResponse(response.content);

    return {
      success: true,
      roadmap,
      metadata: {
        provider: response.metadata?.provider || 'unknown',
        model: response.metadata?.model || 'unknown',
        cached: response.metadata?.cached || false,
        degradedMode: response.metadata?.degradedMode || false,
      },
    };
  } catch (error) {
    console.error('Error generating roadmap:', error);
    return {
      success: false,
      error: 'Failed to generate roadmap. Please try again.',
    };
  }
}

/**
 * Build comprehensive prompt for AI roadmap generation
 */
function buildRoadmapPrompt({
  goal,
  currentLevel,
  targetRole,
  timeframe,
  skills,
  preferredTopics,
  jobDescription,
}) {
  let prompt = `Generate a comprehensive, personalized learning roadmap with the following requirements:

**User Profile:**
- Learning Goal: ${goal}
- Current Level: ${currentLevel}
- Target Role: ${targetRole || 'Not specified'}
- Timeframe: ${timeframe.value} ${timeframe.unit}
- Current Skills: ${skills.length > 0 ? skills.join(', ') : 'None specified'}
- Preferred Topics: ${preferredTopics.length > 0 ? preferredTopics.join(', ') : 'Any'}`;

  // Add job description analysis if provided
  if (jobDescription && jobDescription.trim()) {
    prompt += `\n\n**Target Job Description:**\n${jobDescription}\n\n**IMPORTANT:** Analyze this job description carefully and:\n- Extract required technical skills and qualifications\n- Identify must-have vs nice-to-have skills\n- Determine experience level expectations\n- Note any specific technologies, frameworks, or tools mentioned\n- Tailor the roadmap to match these specific requirements`;
  }

  prompt += `\n\n**Requirements:**
1. **Structured Learning Path:** Divide into clear phases (Foundation → Intermediate → Advanced → Mastery)
2. **Detailed Milestones:** Each phase should have 3-5 concrete milestones with:
   - Specific topics and skills to master
   - Clear learning objectives
   - Estimated time duration (realistic and achievable)
   - Prerequisites and dependencies
3. **Quality Resources:** For each milestone, provide:
   - Top courses (Udemy, Coursera, YouTube channels)
   - Essential articles and documentation
   - Recommended books
   - Practice platforms (LeetCode, HackerRank, etc.)
   - GitHub repositories for reference
4. **Practical Projects:** Include real-world projects that:
   - Reinforce learned concepts
   - Build a strong portfolio
   - Demonstrate skills to potential employers
   - Progressively increase in complexity
5. **Skill Gap Analysis:** If job description provided:
   - Identify gaps between current skills and job requirements
   - Prioritize critical missing skills
   - Suggest timeline to acquire each skill
6. **Industry Best Practices:**
   - DSA practice schedule (if applicable)
   - System design concepts (for senior roles)
   - Behavioral interview preparation
   - Portfolio building strategies
7. **Success Metrics:** Define measurable outcomes for each milestone:
   - Specific projects completed
   - Problems solved
   - Concepts mastered
   - Certifications earned
8. **Weekly Study Plan:** Break down larger goals into weekly actionable tasks
9. **Interview Preparation:** Include specific guidance on:
   - Technical interview topics
   - Common questions for this role
   - Mock interview resources
   - Resume building tips

**Output Format (STRICT JSON):**
\`\`\`json
{
  "title": "Complete, descriptive roadmap title",
  "description": "2-3 sentence overview of the learning journey and expected outcomes",
  "totalDuration": "X weeks/months (based on ${timeframe.value} ${timeframe.unit})",
  "skillGapAnalysis": ${jobDescription ? '"Identify critical skills missing from current skillset that are required for the target role"' : 'null'},
  "weeklyCommitment": "Recommended hours per week",
  "milestones": [
    {
      "id": "milestone-1",
      "title": "Clear, action-oriented milestone title",
      "description": "Detailed description of what you'll learn and build in this phase (3-4 sentences)",
      "phase": "Foundation|Intermediate|Advanced|Mastery",
      "duration": "X weeks (be realistic)",
      "topics": [
        "Specific Topic 1 with depth indication",
        "Specific Topic 2 with practical application"
      ],
      "learningObjectives": [
        "Measurable objective 1",
        "Measurable objective 2"
      ],
      "projects": [
        {
          "name": "Project name",
          "description": "What you'll build",
          "skills": ["Skill 1", "Skill 2"],
          "difficulty": "Beginner|Intermediate|Advanced"
        }
      ],
      "resources": [
        {
          "title": "Specific resource name",
          "url": "https://actual-url.com",
          "type": "course|article|video|book|practice|documentation",
          "duration": "X hours (for courses/videos)",
          "isPriority": true
        }
      ],
      "weeklyBreakdown": [
        {
          "week": 1,
          "focus": "What to focus on this week",
          "tasks": ["Specific task 1", "Specific task 2"],
          "outcomes": ["What you should achieve"]
        }
      ],
      "successMetrics": [
        "Measurable achievement 1",
        "Measurable achievement 2"
      ],
      "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
      "order": 1
    }
  ],
  "interviewPrep": {
    "technicalTopics": ["Topic 1", "Topic 2"],
    "commonQuestions": ["Question 1", "Question 2"],
    "practiceResources": [
      {
        "name": "Platform/Resource name",
        "url": "https://url.com",
        "type": "practice|mock-interview|course"
      }
    ]
  },
  "careerAdvice": {
    "portfolioTips": ["Tip 1", "Tip 2"],
    "networkingStrategies": ["Strategy 1", "Strategy 2"],
    "resumeHighlights": ["What to emphasize based on roadmap"]
  }
}
\`\`\`

**CRITICAL INSTRUCTIONS:**
1. Make the roadmap HIGHLY SPECIFIC to the user's goal and level
2. ${jobDescription ? 'ALIGN ALL milestones, topics, and resources with the provided job description requirements' : 'Focus on industry-standard skills for the target role'}
3. Provide ONLY real, working URLs for resources (popular platforms like Udemy, Coursera, official docs)
4. Make projects PRACTICAL and portfolio-worthy
5. Ensure the timeline is REALISTIC for ${timeframe.value} ${timeframe.unit}
6. Weekly breakdown should be ACTIONABLE with clear daily/weekly tasks
7. Include SPECIFIC success metrics (not vague like "understand X")
8. Return ONLY the JSON, no extra text before or after

Generate the roadmap now:`;

  return prompt;
}

/**
 * Parse AI response and extract structured roadmap
 */
function parseRoadmapResponse(content) {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    const parsed = JSON.parse(jsonString);

    // Validate and normalize structure with enhanced fields
    const roadmap = {
      title: parsed.title || 'Learning Roadmap',
      description: parsed.description || '',
      totalDuration: parsed.totalDuration || 'Variable',
      skillGapAnalysis: parsed.skillGapAnalysis || null,
      weeklyCommitment: parsed.weeklyCommitment || '10-15 hours',
      interviewPrep: parsed.interviewPrep || null,
      careerAdvice: parsed.careerAdvice || null,
      milestones: (parsed.milestones || []).map((m, index) => ({
        id: m.id || `milestone-${index + 1}`,
        title: m.title || `Milestone ${index + 1}`,
        description: m.description || '',
        phase: m.phase || 'Foundation',
        duration: m.duration || '1 week',
        topics: m.topics || [],
        learningObjectives: m.learningObjectives || [],
        projects: m.projects || [],
        weeklyBreakdown: m.weeklyBreakdown || [],
        successMetrics: m.successMetrics || [],
        prerequisites: m.prerequisites || [],
        resources: (m.resources || []).map((r) => ({
          title: r.title || 'Resource',
          url: r.url || '#',
          type: r.type || 'article',
          duration: r.duration || null,
          isPriority: r.isPriority || false,
        })),
        completed: false,
        order: m.order || index + 1,
      })),
    };

    return roadmap;
  } catch (error) {
    console.error('Error parsing roadmap response:', error);

    // Return a fallback basic roadmap
    return generateFallbackRoadmap();
  }
}

/**
 * Generate fallback roadmap if AI generation fails
 */
function generateFallbackRoadmap() {
  return {
    title: 'Basic Learning Roadmap',
    description: 'A structured approach to learning and skill development',
    totalDuration: '12 weeks',
    milestones: [
      {
        id: 'milestone-1',
        title: 'Foundation Concepts',
        description: 'Build strong fundamentals',
        phase: 'Foundation',
        duration: '3 weeks',
        topics: ['Basic Concepts', 'Core Principles', 'Fundamental Patterns'],
        resources: [
          {
            title: 'Documentation',
            url: '#',
            type: 'article',
          },
        ],
        completed: false,
        order: 1,
      },
      {
        id: 'milestone-2',
        title: 'Intermediate Skills',
        description: 'Develop practical skills',
        phase: 'Intermediate',
        duration: '4 weeks',
        topics: ['Applied Concepts', 'Real-World Scenarios', 'Best Practices'],
        resources: [
          {
            title: 'Practice Platform',
            url: '#',
            type: 'practice',
          },
        ],
        completed: false,
        order: 2,
      },
      {
        id: 'milestone-3',
        title: 'Advanced Topics',
        description: 'Master advanced concepts',
        phase: 'Advanced',
        duration: '5 weeks',
        topics: ['Advanced Patterns', 'System Design', 'Optimization'],
        resources: [
          {
            title: 'Advanced Course',
            url: '#',
            type: 'course',
          },
        ],
        completed: false,
        order: 3,
      },
    ],
  };
}

/**
 * Refine existing roadmap based on user feedback
 */
export async function refineRoadmap(existingRoadmap, feedback, preferences) {
  const prompt = `Refine the following learning roadmap based on user feedback:

**Existing Roadmap:**
${JSON.stringify(existingRoadmap, null, 2)}

**User Feedback:**
${feedback}

**New Preferences:**
${JSON.stringify(preferences, null, 2)}

Please adjust the roadmap to better match the user's needs. Maintain the same JSON structure and ensure all milestones are practical and achievable.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0].text;
    const refinedRoadmap = parseRoadmapResponse(content);

    return {
      success: true,
      roadmap: refinedRoadmap,
    };
  } catch (error) {
    console.error('Error refining roadmap:', error);
    return {
      success: false,
      error: 'Failed to refine roadmap',
    };
  }
}

/**
 * Generate next steps based on current progress
 */
export async function generateNextSteps(roadmap, completedMilestones) {
  const completedIds = new Set(completedMilestones);
  const nextMilestone = roadmap.milestones.find((m) => !completedIds.has(m.id));

  if (!nextMilestone) {
    return {
      message: 'Congratulations! You have completed all milestones.',
      nextSteps: [],
    };
  }

  return {
    message: `Next up: ${nextMilestone.title}`,
    nextSteps: [
      `Study: ${nextMilestone.topics.slice(0, 3).join(', ')}`,
      `Complete resources: ${nextMilestone.resources.length} items`,
      `Estimated time: ${nextMilestone.duration}`,
    ],
    milestone: nextMilestone,
  };
}
