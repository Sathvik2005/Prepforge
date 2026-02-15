/**
 * Analyze code complexity and detect algorithmic patterns
 * @param {string} code - The code to analyze
 * @param {string} language - Programming language
 * @returns {Promise<Object>} Complexity analysis
 */
export async function analyzeComplexity(code, language) {
  try {
    const analysis = {
      timeComplexity: estimateTimeComplexity(code, language),
      spaceComplexity: estimateSpaceComplexity(code, language),
      patterns: detectPatterns(code, language),
      loopAnalysis: analyzeLoops(code, language),
      recursionAnalysis: analyzeRecursion(code, language),
      dataStructures: detectDataStructures(code, language),
      recommendations: [],
    };

    // Generate recommendations
    analysis.recommendations = generateRecommendations(analysis, code, language);

    return analysis;
  } catch (error) {
    console.error('Complexity analysis error:', error);
    return {
      timeComplexity: 'Unknown',
      spaceComplexity: 'Unknown',
      patterns: [],
      error: error.message,
    };
  }
}

/**
 * Estimate time complexity
 */
function estimateTimeComplexity(code, language) {
  const loopCount = countNestedLoops(code, language);
  const hasRecursion = detectRecursionPattern(code, language);
  const hasSorting = /\b(sort|Sort|sorted)\b/.test(code);
  const hasExponential = /\b(fibonacci|fib|permutation|combination)\b/i.test(code);

  if (hasExponential) {
    return {
      notation: 'O(2^n)',
      description: 'Exponential - May be inefficient for large inputs',
      category: 'Exponential',
      confidence: 0.7,
    };
  }

  if (loopCount >= 3) {
    return {
      notation: 'O(n^3)',
      description: 'Cubic - Three nested loops detected',
      category: 'Polynomial',
      confidence: 0.85,
    };
  }

  if (loopCount === 2) {
    return {
      notation: 'O(n^2)',
      description: 'Quadratic - Two nested loops detected',
      category: 'Polynomial',
      confidence: 0.9,
    };
  }

  if (hasSorting) {
    return {
      notation: 'O(n log n)',
      description: 'Linearithmic - Sorting operation detected',
      category: 'Efficient',
      confidence: 0.8,
    };
  }

  if (loopCount === 1 || hasRecursion) {
    return {
      notation: 'O(n)',
      description: 'Linear - Single loop or linear recursion',
      category: 'Efficient',
      confidence: 0.85,
    };
  }

  return {
    notation: 'O(1)',
    description: 'Constant - No loops detected',
    category: 'Optimal',
    confidence: 0.7,
  };
}

/**
 * Estimate space complexity
 */
function estimateSpaceComplexity(code, language) {
  const hasRecursion = detectRecursionPattern(code, language);
  const arrayCreations = (code.match(/\[\s*\]|\bnew\s+\w+\[/g) || []).length;
  const hasHashMap = /\bMap\b|\bdict\b|\bHashMap\b|\bSet\b/.test(code);
  const hasDPTable = /\bdp\[|\bmemo\[|\btable\[/.test(code);

  if (hasDPTable || (arrayCreations >= 2)) {
    return {
      notation: 'O(n^2)',
      description: 'Quadratic space - Multi-dimensional array or DP table',
      category: 'High',
      confidence: 0.8,
    };
  }

  if (hasHashMap || arrayCreations >= 1) {
    return {
      notation: 'O(n)',
      description: 'Linear space - Array or hash map storage',
      category: 'Moderate',
      confidence: 0.85,
    };
  }

  if (hasRecursion) {
    return {
      notation: 'O(n)',
      description: 'Linear space - Recursion stack',
      category: 'Moderate',
      confidence: 0.75,
    };
  }

  return {
    notation: 'O(1)',
    description: 'Constant space - In-place operations',
    category: 'Optimal',
    confidence: 0.7,
  };
}

/**
 * Detect algorithmic patterns
 */
function detectPatterns(code, language) {
  const patterns = [];

  // Two Pointers
  if (/\b(left|right|start|end)\b.*\b(left|right|start|end)\b/s.test(code)) {
    patterns.push({
      name: 'Two Pointers',
      description: 'Uses two pointers to traverse the data structure',
      confidence: 0.75,
    });
  }

  // Sliding Window
  if (/\b(window|windowStart|windowEnd)\b/.test(code)) {
    patterns.push({
      name: 'Sliding Window',
      description: 'Uses sliding window technique for subarray problems',
      confidence: 0.85,
    });
  }

  // Dynamic Programming
  if (/\b(dp|memo|table|cache)\b/.test(code) || /\bmemoiz/i.test(code)) {
    patterns.push({
      name: 'Dynamic Programming',
      description: 'Uses memoization or tabulation for optimal substructure',
      confidence: 0.8,
    });
  }

  // Binary Search
  if (/\b(binary.?search|bisect)\b/i.test(code) || /\bmid\s*=.*\((?:left|start).*\+.*(?:right|end)\)\s*\/\/?\s*2/.test(code)) {
    patterns.push({
      name: 'Binary Search',
      description: 'Uses binary search for logarithmic search time',
      confidence: 0.85,
    });
  }

  // BFS/DFS
  if (/\b(queue|Queue|deque)\b/.test(code) && /\b(append|push|offer)\b/.test(code)) {
    patterns.push({
      name: 'Breadth-First Search (BFS)',
      description: 'Level-order graph/tree traversal',
      confidence: 0.8,
    });
  }

  if (/\b(stack|Stack|dfs|DFS)\b/.test(code) || (detectRecursionPattern(code, language) && /\b(graph|tree|node)\b/i.test(code))) {
    patterns.push({
      name: 'Depth-First Search (DFS)',
      description: 'Depth-first graph/tree traversal',
      confidence: 0.75,
    });
  }

  // Greedy
  if (/\b(greedy|min|max|heap|priority)\b/i.test(code) && !/\bdp\b/.test(code)) {
    patterns.push({
      name: 'Greedy Algorithm',
      description: 'Makes locally optimal choices',
      confidence: 0.7,
    });
  }

  // Backtracking
  if (detectRecursionPattern(code, language) && /\b(backtrack|permutation|combination|subset)\b/i.test(code)) {
    patterns.push({
      name: 'Backtracking',
      description: 'Explores all possible solutions recursively',
      confidence: 0.8,
    });
  }

  // Divide and Conquer
  if (/\b(merge|partition|quick|divide)\b/i.test(code) && detectRecursionPattern(code, language)) {
    patterns.push({
      name: 'Divide and Conquer',
      description: 'Divides problem into smaller subproblems',
      confidence: 0.75,
    });
  }

  return patterns;
}

/**
 * Analyze loops in code
 */
function analyzeLoops(code, language) {
  const loopPatterns = {
    python: /\bfor\s+\w+\s+in\s+|\bwhile\s+/g,
    java: /\bfor\s*\(|\bwhile\s*\(/g,
    javascript: /\bfor\s*\(|\bwhile\s*\(|\.forEach\(|\.map\(|\.filter\(/g,
  };

  const pattern = loopPatterns[language] || loopPatterns.javascript;
  const loops = code.match(pattern) || [];

  return {
    count: loops.length,
    nestedLevel: countNestedLoops(code, language),
    types: categorizeLoops(loops, language),
  };
}

/**
 * Analyze recursion
 */
function analyzeRecursion(code, language) {
  const hasRecursion = detectRecursionPattern(code, language);
  
  if (!hasRecursion) {
    return {
      isRecursive: false,
      type: null,
    };
  }

  // Detect tail recursion
  const isTailRecursive = /return\s+\w+\([^)]*\)\s*;?\s*$/.test(code);

  // Detect multiple recursive calls (tree recursion)
  const recursiveCallsMatch = code.match(/\breturn.*\w+\([^)]*\).*\w+\([^)]*\)/);
  const isTreeRecursion = !!recursiveCallsMatch;

  return {
    isRecursive: true,
    type: isTreeRecursion ? 'Tree Recursion' : (isTailRecursive ? 'Tail Recursion' : 'Linear Recursion'),
    optimizable: isTailRecursive,
  };
}

/**
 * Detect data structures used
 */
function detectDataStructures(code, language) {
  const structures = [];

  if (/\barray\b|\[\s*\]|new\s+\w+\[/i.test(code)) {
    structures.push('Array');
  }

  if (/\bMap\b|\bHashMap\b|\bdict\b|\{\s*\}/i.test(code)) {
    structures.push('Hash Map');
  }

  if (/\bSet\b|\bHashSet\b/i.test(code)) {
    structures.push('Hash Set');
  }

  if (/\bqueue\b|\bQueue\b|\bdeque\b/i.test(code)) {
    structures.push('Queue');
  }

  if (/\bstack\b|\bStack\b/i.test(code)) {
    structures.push('Stack');
  }

  if (/\bheap\b|\bPriorityQueue\b|\bheapq\b/i.test(code)) {
    structures.push('Heap/Priority Queue');
  }

  if (/\btree\b|\bnode\b.*\bleft\b.*\bright\b/i.test(code)) {
    structures.push('Tree');
  }

  if (/\bgraph\b|\badjacency\b/i.test(code)) {
    structures.push('Graph');
  }

  return structures;
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(analysis, code, language) {
  const recommendations = [];

  // Complexity warnings
  if (analysis.timeComplexity.category === 'Exponential') {
    recommendations.push({
      type: 'warning',
      message: 'Exponential time complexity - Consider dynamic programming or memoization',
      priority: 'high',
    });
  }

  if (analysis.timeComplexity.category === 'Polynomial' && analysis.loopAnalysis.nestedLevel >= 2) {
    recommendations.push({
      type: 'optimization',
      message: 'Multiple nested loops detected - Consider using hash maps for O(n) solution',
      priority: 'medium',
    });
  }

  // Recursion optimizations
  if (analysis.recursionAnalysis.isRecursive && !analysis.patterns.some(p => p.name === 'Dynamic Programming')) {
    recommendations.push({
      type: 'optimization',
      message: 'Recursion detected - Consider memoization to avoid redundant calculations',
      priority: 'medium',
    });
  }

  // Space optimizations
  if (analysis.spaceComplexity.category === 'High') {
    recommendations.push({
      type: 'info',
      message: 'High space complexity - Consider if in-place operations are possible',
      priority: 'low',
    });
  }

  return recommendations;
}

/**
 * Helper: Count nested loops
 */
function countNestedLoops(code, language) {
  const lines = code.split('\n');
  let maxNesting = 0;
  let currentNesting = 0;

  const loopKeywords = language === 'python' ? ['for ', 'while '] : ['for(', 'for (', 'while(', 'while ('];

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (loopKeywords.some(kw => trimmed.startsWith(kw) || trimmed.includes(' ' + kw))) {
      currentNesting++;
      maxNesting = Math.max(maxNesting, currentNesting);
    }

    // Detect loop end (simplified)
    const indentBefore = line.length - line.trimStart().length;
    if (currentNesting > 0 && indentBefore === 0 && trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//')) {
      currentNesting = 0;
    }
  }

  return maxNesting;
}

/**
 * Helper: Detect recursion pattern
 */
function detectRecursionPattern(code, language) {
  // Extract function name
  const funcPatterns = {
    python: /def\s+(\w+)\s*\(/,
    java: /\b(?:public|private|protected)?\s*(?:static\s+)?[\w<>]+\s+(\w+)\s*\(/,
    javascript: /function\s+(\w+)\s*\(|const\s+(\w+)\s*=.*=>|(\w+)\s*\([^)]*\)\s*{/,
  };

  const pattern = funcPatterns[language] || funcPatterns.javascript;
  const match = code.match(pattern);
  const funcName = match ? (match[1] || match[2] || match[3]) : null;

  if (!funcName) return false;

  // Check if function calls itself
  const callPattern = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
  const calls = code.match(callPattern) || [];
  
  return calls.length >= 2; // Definition + at least one recursive call
}

/**
 * Helper: Categorize loop types
 */
function categorizeLoops(loops, language) {
  if (language === 'python') {
    return {
      for: loops.filter(l => l.includes('for')).length,
      while: loops.filter(l => l.includes('while')).length,
    };
  }

  if (language === 'javascript') {
    return {
      for: loops.filter(l => l.startsWith('for')).length,
      while: loops.filter(l => l.startsWith('while')).length,
      forEach: loops.filter(l => l.includes('forEach')).length,
      map: loops.filter(l => l.includes('map')).length,
    };
  }

  return {
    for: loops.filter(l => l.includes('for')).length,
    while: loops.filter(l => l.includes('while')).length,
  };
}
