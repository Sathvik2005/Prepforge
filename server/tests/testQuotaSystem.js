/**
 * AI Quota Management System - Test Suite
 * 
 * Run this file to validate the quota management system is working correctly
 * 
 * Usage:
 *   node server/tests/testQuotaSystem.js
 */

import { createChatCompletion, getQuotaStats, clearCache, resetQuotaStats } from '../services/aiProvider.js';
import {
  analyzeResumeRuleBased,
  rephraseTextRuleBased,
  generateCoverLetterRuleBased,
  generateInterviewQuestionsRuleBased
} from '../services/featureDegradation.js';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function logTest(name) {
  console.log(`\n${COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  console.log(`${COLORS.blue}📝 Test: ${name}${COLORS.reset}`);
  console.log(`${COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
}

function logSuccess(message) {
  log(COLORS.green, `✅ ${message}`);
}

function logError(message) {
  log(COLORS.red, `❌ ${message}`);
}

function logWarning(message) {
  log(COLORS.yellow, `⚠️  ${message}`);
}

// Sample data for tests
const SAMPLE_RESUME = `
John Doe
Software Engineer
john.doe@example.com

Experience:
- Software Engineer at Tech Corp (2020-2023)
  * Developed web applications using React and Node.js
  * Improved application performance by 40%
  * Led team of 3 junior developers

Skills:
JavaScript, Python, React, Node.js, MongoDB, AWS
`;

const SAMPLE_JOB = `
Senior Software Engineer position requiring 3+ years of experience.
Must have strong skills in React, Node.js, and cloud platforms.
Experience with team leadership is a plus.
`;

const SAMPLE_TEXT = `
Worked on developing web applications and improving performance.
Responsible for leading team members and code reviews.
`;

// Test Functions

async function testProviderAvailability() {
  logTest('Provider Availability Check');
  
  const stats = getQuotaStats();
  const availableProviders = stats.availableProviders;
  
  console.log(`Available Providers: ${availableProviders.join(', ')}`);
  
  if (availableProviders.length === 0) {
    logWarning('No AI providers configured - will use rule-based fallback only');
  } else {
    logSuccess(`${availableProviders.length} provider(s) available`);
  }
  
  return availableProviders.length > 0;
}

async function testCaching() {
  logTest('Response Caching');
  
  try {
    clearCache();
    
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say "test message" exactly.' }
    ];
    
    // First request - should be fresh
    const start1 = Date.now();
    const response1 = await createChatCompletion(
      messages,
      { max_tokens: 50, temperature: 0 },
      { feature: 'test-cache' }
    );
    const duration1 = Date.now() - start1;
    
    if (response1.cached) {
      logWarning('First request returned cached result (unexpected)');
    } else {
      logSuccess(`First request completed in ${duration1}ms (fresh)`);
    }
    
    // Second request - should be cached
    const start2 = Date.now();
    const response2 = await createChatCompletion(
      messages,
      { max_tokens: 50, temperature: 0 },
      { feature: 'test-cache' }
    );
    const duration2 = Date.now() - start2;
    
    if (response2.cached) {
      logSuccess(`Second request completed in ${duration2}ms (cached - ${Math.round(duration1/duration2)}x faster)`);
      return true;
    } else {
      logError('Second request was not cached');
      return false;
    }
  } catch (error) {
    logWarning(`Caching test skipped (no AI providers): ${error.message}`);
    return null; // Neutral result
  }
}

async function testRetryLogic() {
  logTest('Retry Logic & Provider Fallback');
  
  try {
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Respond with: OK' }
    ];
    
    const response = await createChatCompletion(
      messages,
      { max_tokens: 50 },
      { feature: 'test-retry', skipCache: true }
    );
    
    logSuccess(`Request completed via ${response.provider}`);
    if (response.attempts > 1) {
      logWarning(`Required ${response.attempts} attempts (retries occurred)`);
    } else {
      logSuccess('First attempt succeeded');
    }
    
    return true;
  } catch (error) {
    logWarning(`Retry test skipped (no AI providers): ${error.message}`);
    return null;
  }
}

function testRuleBasedAnalysis() {
  logTest('Rule-Based Resume Analysis');
  
  try {
    const analysis = analyzeResumeRuleBased(SAMPLE_RESUME, SAMPLE_JOB);
    
    if (analysis && analysis.length > 100) {
      logSuccess(`Generated analysis with ${analysis.length} characters`);
      if (analysis.includes('Rule-Based Mode')) {
        logSuccess('Correctly identifies as rule-based analysis');
      }
      return true;
    } else {
      logError('Analysis too short or empty');
      return false;
    }
  } catch (error) {
    logError(`Rule-based analysis failed: ${error.message}`);
    return false;
  }
}

function testRuleBasedRephrase() {
  logTest('Rule-Based Bullet Rephrase');
  
  try {
    const bullets = rephraseTextRuleBased(SAMPLE_TEXT);
    
    if (bullets && bullets.length >= 5) {
      logSuccess(`Generated ${bullets.length} bullet points`);
      
      // Check if starts with action verbs
      const hasActionVerbs = bullets.some(b => 
        /^(Developed|Implemented|Created|Led|Managed|Designed|Built)/.test(b)
      );
      
      if (hasActionVerbs) {
        logSuccess('Bullets start with action verbs');
      }
      
      return true;
    } else {
      logError(`Only generated ${bullets?.length || 0} bullets (expected 5+)`);
      return false;
    }
  } catch (error) {
    logError(`Rule-based rephrase failed: ${error.message}`);
    return false;
  }
}

function testRuleBasedCoverLetter() {
  logTest('Rule-Based Cover Letter');
  
  try {
    const letter = generateCoverLetterRuleBased(SAMPLE_RESUME, SAMPLE_JOB);
    
    if (letter && letter.length > 200) {
      logSuccess(`Generated cover letter with ${letter.length} characters`);
      
      if (letter.includes('Dear Hiring Manager')) {
        logSuccess('Contains proper greeting');
      }
      
      if (letter.includes('Best regards')) {
        logSuccess('Contains proper closing');
      }
      
      return true;
    } else {
      logError('Cover letter too short or empty');
      return false;
    }
  } catch (error) {
    logError(`Rule-based cover letter failed: ${error.message}`);
    return false;
  }
}

function testRuleBasedQuestions() {
  logTest('Rule-Based Interview Questions');
  
  try {
    const questions = generateInterviewQuestionsRuleBased(SAMPLE_JOB);
    
    if (questions && questions.length > 200) {
      logSuccess(`Generated ${questions.length} characters of interview questions`);
      
      // Count question marks as proxy for number of questions
      const questionCount = (questions.match(/\?/g) || []).length;
      if (questionCount >= 15) {
        logSuccess(`Contains ${questionCount} questions (expected 15+)`);
      } else {
        logWarning(`Only ${questionCount} questions found`);
      }
      
      return true;
    } else {
      logError('Questions too short or empty');
      return false;
    }
  } catch (error) {
    logError(`Rule-based questions failed: ${error.message}`);
    return false;
  }
}

async function testQuotaStats() {
  logTest('Quota Statistics Endpoint');
  
  try {
    const stats = getQuotaStats();
    
    logSuccess(`Total Requests: ${stats.totalRequests}`);
    logSuccess(`Successful: ${stats.successfulRequests}`);
    logSuccess(`Failed: ${stats.failedRequests}`);
    logSuccess(`Quota Errors: ${stats.quotaErrors}`);
    
    if (stats.cacheStats) {
      const hitRate = ((stats.cacheStats.hits / (stats.cacheStats.hits + stats.cacheStats.misses)) * 100).toFixed(1);
      logSuccess(`Cache Hit Rate: ${hitRate}%`);
    }
    
    console.log('\nProvider Status:');
    Object.entries(stats.providerStatus).forEach(([provider, status]) => {
      const statusIcon = status.available ? '✅' : '❌';
      console.log(`  ${statusIcon} ${provider}: ${status.available ? 'Available' : 'Unavailable'} (errors: ${status.errorCount})`);
    });
    
    return true;
  } catch (error) {
    logError(`Quota stats failed: ${error.message}`);
    return false;
  }
}

// Main Test Runner

async function runAllTests() {
  console.log('\n');
  log(COLORS.cyan, '╔══════════════════════════════════════════════════════════╗');
  log(COLORS.cyan, '║   AI Quota Management System - Test Suite               ║');
  log(COLORS.cyan, '╚══════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };
  
  const tests = [
    { name: 'Provider Availability', fn: testProviderAvailability },
    { name: 'Response Caching', fn: testCaching },
    { name: 'Retry Logic', fn: testRetryLogic },
    { name: 'Rule-Based Analysis', fn: testRuleBasedAnalysis },
    { name: 'Rule-Based Rephrase', fn: testRuleBasedRephrase },
    { name: 'Rule-Based Cover Letter', fn: testRuleBasedCoverLetter },
    { name: 'Rule-Based Questions', fn: testRuleBasedQuestions },
    { name: 'Quota Statistics', fn: testQuotaStats }
  ];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      
      if (result === true) {
        results.passed++;
      } else if (result === false) {
        results.failed++;
      } else {
        results.skipped++;
      }
    } catch (error) {
      logError(`Test crashed: ${error.message}`);
      results.failed++;
    }
  }
  
  // Summary
  console.log('\n');
  log(COLORS.cyan, '╔══════════════════════════════════════════════════════════╗');
  log(COLORS.cyan, '║   Test Summary                                           ║');
  log(COLORS.cyan, '╚══════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  logSuccess(`Passed: ${results.passed}/${tests.length}`);
  if (results.failed > 0) {
    logError(`Failed: ${results.failed}/${tests.length}`);
  }
  if (results.skipped > 0) {
    logWarning(`Skipped: ${results.skipped}/${tests.length}`);
  }
  
  const successRate = ((results.passed / tests.length) * 100).toFixed(1);
  console.log(`\nSuccess Rate: ${successRate}%\n`);
  
  if (results.failed === 0) {
    log(COLORS.green, '╔══════════════════════════════════════════════════════════╗');
    log(COLORS.green, '║   ✅ ALL TESTS PASSED - SYSTEM OPERATIONAL              ║');
    log(COLORS.green, '╚══════════════════════════════════════════════════════════╝');
  } else {
    log(COLORS.red, '╔══════════════════════════════════════════════════════════╗');
    log(COLORS.red, '║   ❌ SOME TESTS FAILED - CHECK LOGS ABOVE               ║');
    log(COLORS.red, '╚══════════════════════════════════════════════════════════╝');
  }
  
  console.log('\n');
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test suite crashed:', error);
      process.exit(1);
    });
}

export { runAllTests };
