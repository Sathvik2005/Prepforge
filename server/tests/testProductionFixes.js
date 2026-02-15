/**
 * Comprehensive Production Error Fix Test Suite
 * Tests all fixes for 401, 404, and WebSocket errors
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';
const SOCKET_BASE = 'http://localhost:5000';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`),
};

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
};

function recordResult(testName, passed, error = null) {
  results.total++;
  if (passed) {
    results.passed++;
    log.success(testName);
  } else {
    results.failed++;
    results.errors.push({ test: testName, error: error?.message || 'Unknown error' });
    log.error(`${testName}: ${error?.message || 'Failed'}`);
  }
}

// Mock authentication token (replace with real token from login)
let authToken = null;
let testUserId = null;

/**
 * Step 1: Login and get authentication token
 */
async function testAuthentication() {
  log.header('🔐 PHASE 1: Authentication Tests');
  
  try {
    // Try to login with test credentials
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@prepwiser.com',
      password: 'Test123!@#',
    });

    if (response.data.token) {
      authToken = response.data.token;
      testUserId = response.data.user.id || response.data.user._id;
      recordResult('Login successful', true);
      log.info(`Token obtained: ${authToken.substring(0, 20)}...`);
      log.info(`User ID: ${testUserId}`);
      return true;
    } else {
      recordResult('Login failed - no token received', false);
      return false;
    }
  } catch (error) {
    recordResult('Login failed', false, error);
    log.warning('Using mock token for remaining tests');
    
    // Use a mock token format for testing (won't work but allows us to test error handling)
    authToken = 'mock_token_for_testing';
    testUserId = 'mock_user_id';
    return false;
  }
}

/**
 * Step 2: Test Tracking API Endpoints (401 Error Fix)
 */
async function testTrackingAPIs() {
  log.header('📊 PHASE 2: Tracking API Tests (401 Error Fixes)');
  
  // Test 1: GET /api/tracking/metrics
  try {
    const response = await axios.get(`${API_BASE}/tracking/metrics`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    recordResult('GET /api/tracking/metrics', response.status === 200);
    if (response.data) {
      log.info(`Metrics received: ${JSON.stringify(response.data).substring(0, 100)}...`);
    }
  } catch (error) {
    recordResult('GET /api/tracking/metrics', false, error);
  }

  // Test 2: POST /api/tracking/activity
  try {
    const response = await axios.post(
      `${API_BASE}/tracking/activity`,
      {
        activityType: 'test_activity',
        metadata: { test: true },
        duration: 1000,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    recordResult('POST /api/tracking/activity', response.status === 200);
  } catch (error) {
    recordResult('POST /api/tracking/activity', false, error);
  }

  // Test 3: POST /api/tracking/batch
  try {
    const response = await axios.post(
      `${API_BASE}/tracking/batch`,
      {
        activities: [
          {
            activityType: 'test_batch_1',
            metadata: { batch: true },
            timestamp: new Date().toISOString(),
          },
          {
            activityType: 'test_batch_2',
            metadata: { batch: true },
            timestamp: new Date().toISOString(),
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    recordResult('POST /api/tracking/batch', response.status === 200);
  } catch (error) {
    recordResult('POST /api/tracking/batch', false, error);
  }
}

/**
 * Step 3: Test Code Execution API Endpoints (404 Error Fix)
 */
async function testCodeExecutionAPIs() {
  log.header('💻 PHASE 3: Code Execution API Tests (404 Error Fixes)');
  
  const testCode = {
    python: 'print("Hello, PrepWiser!")',
    language: 'python',
    input: '',
  };

  // Test 1: POST /api/code-execution/execute
  try {
    const response = await axios.post(
      `${API_BASE}/code-execution/execute`,
      testCode,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    const success = response.status === 200 && response.data.success;
    recordResult('POST /api/code-execution/execute', success);
    if (response.data.output) {
      log.info(`Execution output: ${response.data.output}`);
    }
  } catch (error) {
    recordResult('POST /api/code-execution/execute', false, error);
  }

  // Test 2: POST /api/code-execution/trace
  try {
    const response = await axios.post(
      `${API_BASE}/code-execution/trace`,
      testCode,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    const success = response.status === 200 && response.data.success;
    recordResult('POST /api/code-execution/trace', success);
  } catch (error) {
    recordResult('POST /api/code-execution/trace', false, error);
  }

  // Test 3: POST /api/code-execution/analyze
  try {
    const response = await axios.post(
      `${API_BASE}/code-execution/analyze`,
      { code: testCode.python, language: testCode.language },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    const success = response.status === 200 && response.data.success;
    recordResult('POST /api/code-execution/analyze', success);
  } catch (error) {
    recordResult('POST /api/code-execution/analyze', false, error);
  }

  // Test 4: POST /api/code-execution/explain
  try {
    const response = await axios.post(
      `${API_BASE}/code-execution/explain`,
      { code: testCode.python, language: testCode.language, mode: 'beginner' },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    const success = response.status === 200 && response.data.success;
    recordResult('POST /api/code-execution/explain', success);
  } catch (error) {
    recordResult('POST /api/code-execution/explain', false, error);
  }
}

/**
 * Step 4: Test WebSocket Connection (WebSocket Error Fix)
 */
async function testWebSocketConnection() {
  log.header('🔌 PHASE 4: WebSocket Connection Tests');
  
  return new Promise((resolve) => {
    const socket = io(SOCKET_BASE, {
      auth: {
        userId: testUserId,
        token: authToken,
      },
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });

    let connectionSuccessful = false;

    socket.on('connect', () => {
      connectionSuccessful = true;
      log.success('WebSocket connected successfully');
      log.info(`Socket ID: ${socket.id}`);
      recordResult('WebSocket connection', true);
      
      // Test joining a room
      socket.emit('join', `user-${testUserId}`);
      
      setTimeout(() => {
        socket.disconnect();
        resolve(true);
      }, 2000);
    });

    socket.on('connect_error', (error) => {
      recordResult('WebSocket connection', false, error);
      socket.disconnect();
      resolve(false);
    });

    socket.on('disconnect', (reason) => {
      if (!connectionSuccessful) {
        recordResult('WebSocket connection', false, new Error(reason));
        resolve(false);
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!connectionSuccessful) {
        recordResult('WebSocket connection', false, new Error('Connection timeout'));
        socket.disconnect();
        resolve(false);
      }
    }, 10000);
  });
}

/**
 * Step 5: Test Health Check
 */
async function testHealthCheck() {
  log.header('🏥 PHASE 5: Health Check');
  
  try {
    const response = await axios.get(`${API_BASE}/health`);
    recordResult('Server health check', response.status === 200);
    log.info(`Server status: ${response.data.status}`);
    log.info(`Version: ${response.data.version}`);
  } catch (error) {
    recordResult('Server health check', false, error);
  }
}

/**
 * Print final test results summary
 */
function printSummary() {
  log.header('📋 TEST SUMMARY');
  
  console.log(`\nTotal Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  
  const passRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(`\nSuccess Rate: ${passRate}%`);
  
  if (results.errors.length > 0) {
    log.header('❌ FAILED TESTS');
    results.errors.forEach(({ test, error }) => {
      console.log(`  • ${test}: ${error}`);
    });
  }
  
  if (results.failed === 0) {
    log.header('🎉 ALL TESTS PASSED! 🎉');
    console.log('\n✅ All production errors have been successfully resolved!');
  } else if (results.passed > 0) {
    log.header('⚠️  PARTIAL SUCCESS');
    console.log('\n✅ Some fixes are working correctly');
    console.log('❌ Some issues still need attention');
  } else {
    log.header('❌ ALL TESTS FAILED');
    console.log('\n⚠️  Please check server status and configuration');
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(`${colors.bold}${colors.cyan}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PrepWiser Production Error Fix - Test Suite');
  console.log('  Testing: 401, 404, WebSocket Fixes');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(colors.reset);
  
  log.info('Starting test suite...');
  log.warning('Make sure the server is running on http://localhost:5000\n');
  
  // Run all test phases
  const authSuccess = await testAuthentication();
  
  if (!authSuccess) {
    log.warning('Authentication failed - some tests may not work correctly');
    log.info('Consider creating a test user: email: test@prepwiser.com, password: Test123!@#');
  }
  
  await testTrackingAPIs();
  await testCodeExecutionAPIs();
  await testWebSocketConnection();
  await testHealthCheck();
  
  // Print summary
  printSummary();
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  log.error(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
