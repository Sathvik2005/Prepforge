/**
 * DYNAMIC ROADMAP GENERATOR - Works for ANY Role/Domain
 * 
 * ZERO HARD-CODING PHILOSOPHY:
 * - No predefined role-to-topic mappings
 * - Logic-based skill gap analysis
 * - Adaptive scheduling algorithms
 * - Works for: Software, Marketing, Design, Finance, Medical, Legal, ANY field
 */

import SmartRoadmap from '../models/SmartRoadmap.js';
import ParsedResume from '../models/ParsedResume.js';
import Question from '../models/Question.js';
import Progress from '../models/Progress.js';

class DynamicRoadmapGenerator {
  
  /**
   * Generate roadmap for ANY role
   */
  async generateRoadmap(userId, {
    targetRole,
    targetDate,
    weeklyHours,
    experienceLevel,
    resumeId,
    jobDescriptionId,
    focusAreas = [],
    customGoals = ''
  }) {
    try {
      // 1. Analyze current state
      const currentState = await this.analyzeCurrentState(userId, resumeId);
      
      // 2. Define target state from JD or role
      const targetState = await this.analyzeTargetState(targetRole, jobDescriptionId);
      
      // 3. Compute skill gaps (dynamic)
      const gaps = this.computeSkillGaps(currentState, targetState);
      
      // 4. Prioritize learning objectives
      const objectives = this.prioritizeLearningObjectives(gaps, experienceLevel, focusAreas);
      
      // 5. Build learning path (DAG with prerequisites)
      const learningPath = this.buildLearningPath(objectives, currentState);
      
      // 6. Schedule tasks (constraint-based)
      const schedule = this.generateSchedule(learningPath, {
        startDate: new Date(),
        targetDate: new Date(targetDate),
        weeklyHours,
        experienceLevel
      });
      
      // 7. Calculate feasibility confidence
      const confidence = this.calculateFeasibility(schedule, {
        weeklyHours,
        targetDate,
        totalObjectives: objectives.length
      });
      
      // 8. Create roadmap document
      const roadmap = new SmartRoadmap({
        userId,
        goals: {
          targetRole,
          targetDate: new Date(targetDate),
          weeklyHours,
          experienceLevel,
          focusAreas,
          customGoals
        },
        roadmap: {
          totalDays: schedule.dailyPlans.length,
          totalTopics: objectives.length,
          estimatedCompletion: schedule.estimatedCompletion,
          confidence,
          dailyPlans: schedule.dailyPlans,
          weeklyMilestones: schedule.weeklyMilestones
        },
        adaptiveMetrics: {
          currentDay: 1,
          overallProgress: 0,
          adherenceScore: 100,
          adjustmentHistory: [],
          performanceMetrics: {
            avgAccuracy: currentState.avgAccuracy || 0,
            avgTimePerQuestion: currentState.avgTimePerQuestion || 0,
            topicsStruggling: [],
            topicsMastered: currentState.masteredSkills || [],
            learningVelocity: currentState.learningVelocity || this.estimateLearningVelocity(experienceLevel)
          }
        },
        algorithmMetadata: {
          version: '2.0.0-dynamic',
          generationMethod: 'dynamic-gap-analysis',
          factors: {
            identifiedGaps: gaps.length,
            currentSkills: currentState.skills.length,
            targetSkills: targetState.requiredSkills.length,
            timeConstraint: Math.ceil((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24)),
            difficultyLevel: experienceLevel
          },
          lastRegenerated: new Date()
        },
        status: 'active'
      });
      
      await roadmap.save();
      return roadmap;
      
    } catch (error) {
      console.error('Roadmap generation error:', error);
      throw new Error(`Failed to generate roadmap: ${error.message}`);
    }
  }
  
  /**
   * Analyze current state from resume and progress
   */
  async analyzeCurrentState(userId, resumeId) {
    const state = {
      skills: [],
      experience: [],
      avgAccuracy: 0,
      avgTimePerQuestion: 0,
      masteredSkills: [],
      learningVelocity: 5
    };
    
    // Get resume data
    if (resumeId) {
      const resume = await ParsedResume.findById(resumeId);
      if (resume) {
        // Extract all skills from resume (domain-agnostic)
        state.skills = Object.values(resume.parsedData.skills || {}).flat();
        state.experience = resume.parsedData.experience || [];
      }
    }
    
    // Get progress data
    const progress = await Progress.find({ userId }).populate('questionId');
    if (progress.length > 0) {
      const correctAnswers = progress.filter(p => p.isCorrect).length;
      state.avgAccuracy = (correctAnswers / progress.length) * 100;
      
      const totalTime = progress.reduce((sum, p) => sum + (p.timeSpent || 0), 0);
      state.avgTimePerQuestion = totalTime / progress.length;
      
      // Identify mastered topics
      const topicPerformance = {};
      progress.forEach(p => {
        if (p.questionId?.topic) {
          const topic = p.questionId.topic;
          if (!topicPerformance[topic]) topicPerformance[topic] = { correct: 0, total: 0 };
          topicPerformance[topic].total++;
          if (p.isCorrect) topicPerformance[topic].correct++;
        }
      });
      
      state.masteredSkills = Object.entries(topicPerformance)
        .filter(([_, stats]) => (stats.correct / stats.total) >= 0.7 && stats.total >= 3)
        .map(([topic]) => topic);
    }
    
    return state;
  }
  
  /**
   * Analyze target state from job description or role
   */
  async analyzeTargetState(targetRole, jobDescriptionId) {
    const targetState = {
      requiredSkills: [],
      preferredSkills: [],
      responsibilities: [],
      domainKeywords: []
    };
    
    if (jobDescriptionId) {
      // Parse job description dynamically
      const JobDescription = (await import('../models/JobDescription.js')).default;
      const jd = await JobDescription.findById(jobDescriptionId);
      
      if (jd) {
        targetState.requiredSkills = jd.parsedData?.requiredSkills || [];
        targetState.preferredSkills = jd.parsedData?.preferredSkills || [];
        targetState.responsibilities = jd.parsedData?.responsibilities || [];
        targetState.domainKeywords = jd.parsedData?.keywords || [];
      }
    } else {
      // Infer from role name using keyword extraction
      targetState.domainKeywords = this.extractDomainKeywordsFromRole(targetRole);
      targetState.requiredSkills = await this.inferSkillsFromDatabase(targetRole);
    }
    
    return targetState;
  }
  
  /**
   * Extract domain keywords from role title
   */
  extractDomainKeywordsFromRole(role) {
    const keywords = role.toLowerCase().split(/[\s,]+/);
    return keywords.filter(kw => kw.length > 2);
  }
  
  /**
   * Infer skills from question database (data-driven)
   */
  async inferSkillsFromDatabase(targetRole) {
    // Find questions related to role keywords
    const roleKeywords = this.extractDomainKeywordsFromRole(targetRole);
    
    const questions = await Question.find({
      $or: [
        { topic: { $in: roleKeywords } },
        { tags: { $in: roleKeywords } },
        { title: { $regex: roleKeywords.join('|'), $options: 'i' } }
      ]
    }).limit(100);
    
    // Extract unique topics
    const topics = [...new Set(questions.map(q => q.topic).filter(Boolean))];
    return topics;
  }
  
  /**
   * Compute skill gaps dynamically
   */
  computeSkillGaps(currentState, targetState) {
    const gaps = [];
    
    // Required skills not in current skills
    const currentSkillsLower = currentState.skills.map(s => s.toLowerCase());
    
    targetState.requiredSkills.forEach(requiredSkill => {
      const skillLower = requiredSkill.toLowerCase();
      
      if (!currentSkillsLower.some(cs => cs.includes(skillLower) || skillLower.includes(cs))) {
        gaps.push({
          skill: requiredSkill,
          type: 'missing',
          severity: 'high',
          reason: 'Required by target role but not in resume'
        });
      }
    });
    
    // Preferred skills
    targetState.preferredSkills.forEach(prefSkill => {
      const skillLower = prefSkill.toLowerCase();
      
      if (!currentSkillsLower.some(cs => cs.includes(skillLower) || skillLower.includes(cs))) {
        gaps.push({
          skill: prefSkill,
          type: 'missing',
          severity: 'medium',
          reason: 'Preferred by target role'
        });
      }
    });
    
    return gaps;
  }
  
  /**
   * Prioritize learning objectives
   */
  prioritizeLearningObjectives(gaps, experienceLevel, focusAreas) {
    // Calculate priority score for each gap
    const objectives = gaps.map(gap => {
      let priority = 0;
      
      // Severity weight
      if (gap.severity === 'high') priority += 100;
      else if (gap.severity === 'medium') priority += 50;
      else priority += 25;
      
      // User focus areas
      if (focusAreas.some(fa => gap.skill.toLowerCase().includes(fa.toLowerCase()))) {
        priority += 75;
      }
      
      return {
        skill: gap.skill,
        priority,
        estimatedHours: this.estimateHoursForSkill(gap.skill, experienceLevel),
        prerequisites: this.identifyPrerequisites(gap.skill),
        learningResources: this.suggestResources(gap.skill)
      };
    });
    
    // Sort by priority
    objectives.sort((a, b) => b.priority - a.priority);
    
    return objectives;
  }
  
  /**
   * Estimate hours needed for a skill (logic-based)
   */
  estimateHoursForSkill(skill, experienceLevel) {
    const baseHours = {
      beginner: 40,
      intermediate: 25,
      advanced: 15
    };
    
    const multipliers = {
      // Complex topics need more time
      algorithm: 1.5,
      system: 1.5,
      design: 1.4,
      architecture: 1.5,
      
      // Tools/frameworks are faster
      framework: 0.8,
      tool: 0.7,
      library: 0.7
    };
    
    let hours = baseHours[experienceLevel] || 25;
    
    // Apply multipliers based on skill keywords
    const skillLower = skill.toLowerCase();
    for (const [keyword, multiplier] of Object.entries(multipliers)) {
      if (skillLower.includes(keyword)) {
        hours *= multiplier;
        break;
      }
    }
    
    return Math.round(hours);
  }
  
  /**
   * Identify prerequisites dynamically
   */
  identifyPrerequisites(skill) {
    const prereqRules = {
      // Pattern: if skill contains X, it needs Y
      advanced: ['beginner', 'intermediate'],
      framework: ['programming basics'],
      architecture: ['design patterns', 'data structures'],
      system: ['algorithms', 'data structures'],
      machine: ['statistics', 'linear algebra', 'programming']
    };
    
    const prerequisites = [];
    const skillLower = skill.toLowerCase();
    
    for (const [keyword, prereqs] of Object.entries(prereqRules)) {
      if (skillLower.includes(keyword)) {
        prerequisites.push(...prereqs);
      }
    }
    
    return [...new Set(prerequisites)];
  }
  
  /**
   * Suggest learning resources
   */
  suggestResources(skill) {
    // Generic resource templates
    const skillFormatted = skill.replace(/\s+/g, '+');
    
    return [
      `https://www.google.com/search?q=${skillFormatted}+tutorial`,
      `https://www.youtube.com/results?search_query=${skillFormatted}+course`,
      `https://stackoverflow.com/questions/tagged/${skill.toLowerCase()}`
    ];
  }
  
  /**
   * Build learning path (DAG)
   */
  buildLearningPath(objectives, currentState) {
    const path = [];
    const completed = new Set(currentState.masteredSkills.map(s => s.toLowerCase()));
    
    // Topological sort with prerequisites
    const queue = objectives.filter(obj => 
      obj.prerequisites.every(prereq => completed.has(prereq.toLowerCase()))
    );
    
    while (queue.length > 0) {
      const current = queue.shift();
      path.push(current);
      completed.add(current.skill.toLowerCase());
      
      // Add newly available objectives
      objectives.forEach(obj => {
        if (!path.includes(obj) && !queue.includes(obj)) {
          if (obj.prerequisites.every(prereq => completed.has(prereq.toLowerCase()))) {
            queue.push(obj);
          }
        }
      });
    }
    
    return path;
  }
  
  /**
   * Generate schedule (constraint-based)
   */
  generateSchedule(learningPath, { startDate, targetDate, weeklyHours, experienceLevel }) {
    const dailyPlans = [];
    const totalDays = Math.ceil((targetDate - startDate) / (1000 * 60 * 60 * 24));
    const hoursPerDay = weeklyHours / 7;
    
    let currentDate = new Date(startDate);
    let dayNumber = 1;
    let pathIndex = 0;
    
    while (pathIndex < learningPath.length && dayNumber <= totalDays) {
      const objective = learningPath[pathIndex];
      const remainingHours = objective.estimatedHours;
      
      // Allocate to days
      let hoursAllocated = 0;
      const tasksForDay = [];
      
      while (hoursAllocated < hoursPerDay && pathIndex < learningPath.length) {
        const obj = learningPath[pathIndex];
        const hoursToAdd = Math.min(obj.estimatedHours, hoursPerDay - hoursAllocated);
        
        tasksForDay.push({
          name: obj.skill,
          difficulty: this.mapExperienceToDifficulty(experienceLevel),
          estimatedTime: Math.round(hoursToAdd * 60),
          priority: obj.priority > 100 ? 'high' : obj.priority > 50 ? 'medium' : 'low',
          questionIds: [],
          resources: obj.learningResources
        });
        
        hoursAllocated += hoursToAdd;
        obj.estimatedHours -= hoursToAdd;
        
        if (obj.estimatedHours <= 0) {
          pathIndex++;
        }
      }
      
      dailyPlans.push({
        day: dayNumber++,
        date: new Date(currentDate),
        topics: tasksForDay,
        totalEstimatedTime: Math.round(hoursAllocated * 60),
        isCompleted: false
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Generate weekly milestones
    const weeklyMilestones = this.generateWeeklyMilestones(dailyPlans);
    
    return {
      dailyPlans,
      weeklyMilestones,
      estimatedCompletion: new Date(currentDate)
    };
  }
  
  /**
   * Map experience level to difficulty
   */
  mapExperienceToDifficulty(experienceLevel) {
    const mapping = {
      beginner: 'easy',
      intermediate: 'medium',
      advanced: 'hard'
    };
    return mapping[experienceLevel] || 'medium';
  }
  
  /**
   * Generate weekly milestones
   */
  generateWeeklyMilestones(dailyPlans) {
    const milestones = [];
    const totalDays = dailyPlans.length;
    const weeksNeeded = Math.ceil(totalDays / 7);
    
    for (let week = 1; week <= weeksNeeded; week++) {
      const weekStart = (week - 1) * 7;
      const weekEnd = Math.min(week * 7, totalDays);
      const weekDays = dailyPlans.slice(weekStart, weekEnd);
      
      const topicsCovered = [...new Set(weekDays.flatMap(day => day.topics.map(t => t.name)))];
      const expectedProgress = (weekEnd / totalDays) * 100;
      
      milestones.push({
        week,
        startDate: weekDays[0]?.date,
        endDate: weekDays[weekDays.length - 1]?.date,
        goals: [
          `Master ${topicsCovered.length} new skills`,
          `Complete ${weekDays.length} days of study`,
          `Reach ${Math.round(expectedProgress)}% progress`
        ],
        topicsCovered,
        expectedProgress,
        actualProgress: 0,
        isCompleted: false
      });
    }
    
    return milestones;
  }
  
  /**
   * Calculate feasibility confidence
   */
  calculateFeasibility(schedule, { weeklyHours, targetDate, totalObjectives }) {
    const totalHoursNeeded = schedule.dailyPlans.reduce((sum, day) => sum + (day.totalEstimatedTime / 60), 0);
    const weeksAvailable = Math.ceil((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24 * 7));
    const totalHoursAvailable = weeksAvailable * weeklyHours;
    
    // Confidence factors
    const timeRatio = totalHoursAvailable / totalHoursNeeded;
    const paceScore = Math.min(timeRatio, 1.0);
    
    const objectiveScore = totalObjectives <= 10 ? 1.0 : Math.max(0.5, 10 / totalObjectives);
    
    const confidence = (paceScore * 0.7) + (objectiveScore * 0.3);
    
    return Math.round(confidence * 100) / 100;
  }
  
  /**
   * Estimate learning velocity
   */
  estimateLearningVelocity(experienceLevel) {
    const velocities = {
      beginner: 3,
      intermediate: 5,
      advanced: 8
    };
    return velocities[experienceLevel] || 5;
  }
  
  /**
   * Regenerate roadmap
   */
  async regenerateRoadmap(roadmapId, reason) {
    const roadmap = await SmartRoadmap.findById(roadmapId);
    if (!roadmap) throw new Error('Roadmap not found');
    
    // Mark old as paused
    roadmap.status = 'paused';
    roadmap.adaptiveMetrics.adjustmentHistory.push({
      date: new Date(),
      reason,
      changes: 'Full regeneration',
      impact: 'New roadmap created'
    });
    await roadmap.save();
    
    // Generate new
    return this.generateRoadmap(roadmap.userId, roadmap.goals);
  }
}

export default new DynamicRoadmapGenerator();
