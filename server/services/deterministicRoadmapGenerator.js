import crypto from 'crypto';

const RULE_SET_VERSION = '1.0.0';

// Task library mapping skills to tasks
const TASK_LIBRARY = {
  'python': [
    { id: 'python-basics', title: 'Python Fundamentals', hours: 20, phase: 'Foundation', topics: ['Variables', 'Data Types', 'Control Flow'] },
    { id: 'python-oop', title: 'Object-Oriented Python', hours: 15, phase: 'Intermediate', topics: ['Classes', 'Inheritance', 'Polymorphism'], prerequisites: ['python-basics'] },
  ],
  'javascript': [
    { id: 'js-basics', title: 'JavaScript Fundamentals', hours: 20, phase: 'Foundation', topics: ['ES6+', 'DOM', 'Events'] },
    { id: 'js-async', title: 'Asynchronous JavaScript', hours: 15, phase: 'Intermediate', topics: ['Promises', 'Async/Await'], prerequisites: ['js-basics'] },
  ],
  'react': [
    { id: 'react-basics', title: 'React Fundamentals', hours: 25, phase: 'Intermediate', topics: ['Components', 'Props', 'State'], prerequisites: ['js-basics'] },
    { id: 'react-hooks', title: 'React Hooks', hours: 15, phase: 'Advanced', topics: ['useState', 'useEffect', 'Custom Hooks'], prerequisites: ['react-basics'] },
  ],
  'ml': [
    { id: 'ml-basics', title: 'Machine Learning Basics', hours: 30, phase: 'Foundation', topics: ['Supervised Learning', 'Model Training'] },
    { id: 'ml-algorithms', title: 'ML Algorithms', hours: 40, phase: 'Intermediate', topics: ['Decision Trees', 'Neural Networks'], prerequisites: ['ml-basics'] },
  ],
  'dsa': [
    { id: 'dsa-arrays', title: 'Arrays & Strings', hours: 20, phase: 'Foundation', topics: ['Array operations', 'String manipulation'] },
    { id: 'dsa-linkedlists', title: 'Linked Lists', hours: 15, phase: 'Foundation', topics: ['Singly Linked List', 'Doubly Linked List'] },
    { id: 'dsa-trees', title: 'Trees & Graphs', hours: 30, phase: 'Intermediate', topics: ['Binary Trees', 'Graph Traversal'], prerequisites: ['dsa-arrays'] },
  ],
  'system-design': [
    { id: 'sd-basics', title: 'System Design Fundamentals', hours: 20, phase: 'Advanced', topics: ['Scalability', 'CAP Theorem'] },
    { id: 'sd-patterns', title: 'Design Patterns', hours: 25, phase: 'Mastery', topics: ['Microservices', 'Load Balancing'], prerequisites: ['sd-basics'] },
  ],
};

// Role-to-skills mapping
const ROLE_SKILLS = {
  'frontend developer': ['javascript', 'react', 'css', 'html', 'dsa'],
  'backend developer': ['python', 'nodejs', 'database', 'api', 'dsa'],
  'full stack developer': ['javascript', 'react', 'nodejs', 'database', 'dsa'],
  'data scientist': ['python', 'ml', 'sql', 'statistics'],
  'ml engineer': ['python', 'ml', 'deep-learning', 'deployment'],
  'software engineer': ['dsa', 'system-design', 'coding', 'debugging'],
};

/**
 * Main deterministic roadmap generator
 * NO LLM logic here - only deterministic rules
 */
export async function generateDeterministicRoadmap(inputs) {
  const startTime = Date.now();
  const deterministicLog = [];
  
  console.log('🎯 Deterministic generation started:', inputs.role);
  
  // Step 1: Extract required skills from role
  const requiredSkills = extractRequiredSkills(inputs.role, inputs.jdText);
  deterministicLog.push({
    ruleName: 'extractRequiredSkills',
    outputSnippet: requiredSkills.slice(0, 5).join(', '),
    triggeredValue: requiredSkills.length
  });
  
  // Step 2: Compute skill gaps
  const skillGaps = computeSkillGaps(requiredSkills, inputs.experience);
  deterministicLog.push({
    ruleName: 'computeSkillGaps',
    outputSnippet: `${skillGaps.length} gaps identified`,
    triggeredValue: skillGaps.map(g => g.skill)
  });
  
  // Step 3: Map gaps to tasks
  const tasks = mapGapsToTasks(skillGaps);
  deterministicLog.push({
    ruleName: 'mapGapsToTasks',
    outputSnippet: `${tasks.length} tasks selected`,
    triggeredValue: tasks.length
  });
  
  // Step 4: Build prerequisite DAG
  const dag = buildPrerequisiteDAG(tasks);
  deterministicLog.push({
    ruleName: 'buildPrerequisiteDAG',
    outputSnippet: `DAG with ${dag.length} nodes`,
    triggeredValue: dag.length
  });
  
  // Step 5: Schedule tasks
  const schedule = scheduleTasks(dag, inputs.targetDate, inputs.weeklyHours);
  deterministicLog.push({
    ruleName: 'scheduleTasks',
    outputSnippet: `${schedule.dailyPlans.length} days scheduled`,
    triggeredValue: schedule.dailyPlans.length
  });
  
  // Step 6: Group into phases
  const phases = groupIntoPhases(dag);
  deterministicLog.push({
    ruleName: 'groupIntoPhases',
    outputSnippet: `${phases.length} phases created`,
    triggeredValue: phases.map(p => p.name)
  });
  
  // Step 7: Compute feasibility
  const feasibility = computeFeasibility(tasks, inputs.targetDate, inputs.weeklyHours);
  deterministicLog.push({
    ruleName: 'computeFeasibility',
    outputSnippet: `Score: ${feasibility.value}`,
    triggeredValue: feasibility.value
  });
  
  // Build roadmap structure
  const roadmap = {
    phases,
    milestones: dag,
    schedule,
    feasibilityScore: feasibility,
    summary: {
      totalHours: tasks.reduce((sum, t) => sum + t.hours, 0),
      totalTasks: tasks.length,
      duration: Math.ceil((new Date(inputs.targetDate) - Date.now()) / (1000 * 60 * 60 * 24))
    }
  };
  
  const generatorParams = {
    requiredSkills,
    skillGaps: skillGaps.map(g => g.skill),
    taskSelectionCriteria: 'prerequisite-based',
    schedulingAlgorithm: 'greedy-fit',
    bufferPercentage: 20,
    executionTimeMs: Date.now() - startTime
  };
  
  console.log('✅ Deterministic generation complete:', roadmap.summary);
  
  return {
    roadmap,
    deterministicLog,
    generatorParams
  };
}

/**
 * Extract required skills from role and JD
 */
function extractRequiredSkills(role, jdText) {
  const roleLower = role.toLowerCase();
  let skills = [];
  
  // Get base skills from role
  for (const [key, value] of Object.entries(ROLE_SKILLS)) {
    if (roleLower.includes(key)) {
      skills.push(...value);
    }
  }
  
  // Extract skills from JD text
  if (jdText) {
    const jdLower = jdText.toLowerCase();
    const availableSkills = Object.keys(TASK_LIBRARY);
    availableSkills.forEach(skill => {
      if (jdLower.includes(skill)) {
        skills.push(skill);
      }
    });
  }
  
  return [...new Set(skills)];
}

/**
 * Compute skill gaps based on experience level
 */
function computeSkillGaps(requiredSkills, experience) {
  const experienceLevels = { novice: 0, intermediate: 0.5, advanced: 0.8 };
  const currentLevel = experienceLevels[experience] || 0;
  
  return requiredSkills.map(skill => ({
    skill,
    currentLevel,
    targetLevel: 1.0,
    gap: 1.0 - currentLevel,
    priority: 1.0 - currentLevel
  }));
}

/**
 * Map skill gaps to specific tasks from library
 */
function mapGapsToTasks(skillGaps) {
  const tasks = [];
  
  skillGaps.forEach(gap => {
    const skillTasks = TASK_LIBRARY[gap.skill] || [];
    skillTasks.forEach(task => {
      tasks.push({
        ...task,
        id: task.id || `task-${tasks.length + 1}`,
        priority: gap.priority
      });
    });
  });
  
  return tasks;
}

/**
 * Build prerequisite DAG
 */
function buildPrerequisiteDAG(tasks) {
  return tasks.map((task, index) => ({
    id: task.id,
    title: task.title,
    estimatedHours: task.hours,
    duration: formatDuration(task.hours),
    phase: task.phase || 'Foundation',
    topics: task.topics || [],
    resources: [],
    prerequisites: task.prerequisites || [],
    dependencies: [],
    completed: false,
    description: '', // Will be filled by LLM phrasing
    order: index + 1
  }));
}

/**
 * Schedule tasks into daily plans
 */
function scheduleTasks(tasks, targetDate, weeklyHours) {
  const dailyPlans = [];
  const targetTimestamp = new Date(targetDate).getTime();
  const today = Date.now();
  const availableDays = Math.ceil((targetTimestamp - today) / (1000 * 60 * 60 * 24));
  const hoursPerDay = weeklyHours / 7;
  
  let currentDate = new Date(today);
  let remainingTasks = [...tasks];
  
  while (remainingTasks.length > 0 && dailyPlans.length < availableDays) {
    const dayTasks = [];
    let dayHours = 0;
    
    // Greedy fit: add tasks until day is full
    for (let i = 0; i < remainingTasks.length; i++) {
      const task = remainingTasks[i];
      if (dayHours + task.estimatedHours <= hoursPerDay) {
        dayTasks.push({
          taskId: task.id,
          hours: task.estimatedHours,
          status: 'pending'
        });
        dayHours += task.estimatedHours;
        remainingTasks.splice(i, 1);
        i--;
      }
    }
    
    if (dayTasks.length > 0) {
      dailyPlans.push({
        date: new Date(currentDate),
        tasks: dayTasks
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return { dailyPlans };
}

/**
 * Group tasks into phases
 */
function groupIntoPhases(tasks) {
  const phaseNames = ['Foundation', 'Intermediate', 'Advanced', 'Mastery'];
  const phases = [];
  
  phaseNames.forEach((name, index) => {
    const phaseTasks = tasks.filter(t => t.phase === name);
    if (phaseTasks.length > 0) {
      const totalHours = phaseTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
      phases.push({
        id: `phase-${index + 1}`,
        name,
        order: index + 1,
        durationDays: Math.ceil(totalHours / 8),
        confidence: 85 - (index * 10),
        milestones: phaseTasks
      });
    }
  });
  
  return phases;
}

/**
 * Compute feasibility score using deterministic rules
 */
function computeFeasibility(tasks, targetDate, weeklyHours) {
  const reasons = [];
  let score = 100;
  
  const totalHours = tasks.reduce((sum, t) => sum + t.hours, 0);
  const targetTimestamp = new Date(targetDate).getTime();
  const availableDays = Math.ceil((targetTimestamp - Date.now()) / (1000 * 60 * 60 * 24));
  const availableHours = (availableDays / 7) * weeklyHours;
  
  // Rule: Check if enough time
  const utilizationRate = totalHours / availableHours;
  if (utilizationRate > 0.8) {
    score -= 30;
    reasons.push({
      ruleName: 'timeConstraint',
      threshold: 0.8,
      value: utilizationRate,
      passed: false
    });
  } else {
    reasons.push({
      ruleName: 'timeConstraint',
      threshold: 0.8,
      value: utilizationRate,
      passed: true
    });
  }
  
  // Rule: Check weekly hours realistic
  if (weeklyHours > 40) {
    score -= 20;
    reasons.push({
      ruleName: 'weeklyHoursRealistic',
      threshold: 40,
      value: weeklyHours,
      passed: false
    });
  } else {
    reasons.push({
      ruleName: 'weeklyHoursRealistic',
      threshold: 40,
      value: weeklyHours,
      passed: true
    });
  }
  
  // Rule: Check task count reasonable
  if (tasks.length > 50) {
    score -= 15;
    reasons.push({
      ruleName: 'taskCountManageable',
      threshold: 50,
      value: tasks.length,
      passed: false
    });
  } else {
    reasons.push({
      ruleName: 'taskCountManageable',
      threshold: 50,
      value: tasks.length,
      passed: true
    });
  }
  
  return {
    value: Math.max(0, Math.min(100, score)),
    reasons
  };
}

/**
 * Helper: format duration
 */
function formatDuration(hours) {
  if (hours < 8) return `${hours} hours`;
  const days = Math.ceil(hours / 8);
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  const weeks = Math.ceil(days / 7);
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
}

/**
 * Hash function for prompt tracking
 */
export function hashPrompt(prompt) {
  return crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16);
}

export { RULE_SET_VERSION };
