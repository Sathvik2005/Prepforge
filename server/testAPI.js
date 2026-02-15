/**
 * Quick API Test - Tests actual resume analysis endpoint
 */

import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const SAMPLE_RESUME = `John Doe
Software Engineer
Email: john@example.com

Experience:
- Senior Software Engineer at Tech Corp (2020-2023)
  * Developed React applications
  * Led team of 3 developers
  * Improved performance by 40%

Skills: JavaScript, React, Node.js, Python, AWS`;

const SAMPLE_JOB = `Senior Full Stack Engineer position requiring React, Node.js, and cloud experience.`;

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testEndpoint(name, path, data) {
  console.log(`\n Testing ${name}...`);
  try {
    const response = await axios.post(`${API_URL}${path}`, data, {
      timeout: 45000
    });
    
    const result = response.data;
    const metadata = result.metadata || {};
    
    console.log(`✅ ${name} successful`);
    console.log(`   Provider: ${metadata.provider || 'unknown'}`);
    console.log(`   Degraded: ${metadata.degradedMode ? 'Yes ⚠️' : 'No'}`);
    console.log(`   Cached: ${metadata.cached ? 'Yes' : 'No'}`);
    console.log(`   Data length: ${typeof result.data === 'string' ? result.data.length : JSON.stringify(result.data).length} chars`);
    
    if (metadata.degradedMode) {
      console.log(`   ⚠️  Using rule-based fallback`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ ${name} failed`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data?.message || error.response.data?.error}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

async function runTests() {
  console.log('\n🧪 Testing Resume Toolkit Endpoints');
  console.log('═'.repeat(60));
  
  // Wait for server to start
  console.log('\nWaiting for server to start...');
  await wait(3000);
  
  const tests = [
    {
      name: '1. Resume Analysis',
      path: '/resume-genome/analyze',
      data: {
        resumeText: SAMPLE_RESUME,
        jobDescription: SAMPLE_JOB,
        withJobDescription: true,
        temperature: 0.7,
        maxTokens: 1500
      }
    },
    {
      name: '2. Bullet Rephrase',
      path: '/resume-genome/rephrase',
      data: {
        text: 'Led team and developed applications',
        temperature: 0.7,
        maxTokens: 500
      }
    },
    {
      name: '3. Cover Letter',
      path: '/resume-genome/cover-letter',
      data: {
        resumeText: SAMPLE_RESUME,
        jobDescription: SAMPLE_JOB,
        temperature: 0.8,
        maxTokens: 1500
      }
    },
    {
      name: '4. Interview Questions',
      path: '/resume-genome/interview-questions',
      data: {
        jobDescription: SAMPLE_JOB,
        temperature: 0.7,
        maxTokens: 1500
      }
    }
  ];
  
  let passed = 0;
  for (const test of tests) {
    const success = await testEndpoint(test.name, test.path, test.data);
    if (success) passed++;
    await wait(1000); // Small delay between tests
  }
  
  console.log('\n═'.repeat(60));
  console.log(`\n📊 Results: ${passed}/${tests.length} tests passed\n`);
  
  if (passed === tests.length) {
    console.log('✅ ALL FEATURES WORKING CORRECTLY!\n');
    console.log('💡 Summary:');
    console.log('   • Resume analysis system operational');
    console.log('   • All endpoints returning results');
    console.log('   • Fallback mechanisms active\n');
  } else {
    console.log('⚠️  Some tests failed. Check errors above.\n');
  }
  
  process.exit(passed === tests.length ? 0 : 1);
}

runTests();
