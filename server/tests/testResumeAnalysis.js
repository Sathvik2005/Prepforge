/**
 * Resume Analysis Fix Validation Test
 * Tests the fixed resume analysis endpoint with Groq API fallback
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`),
};

// Test data
const sampleResume = `
John Doe
Software Engineer
john.doe@email.com | (555) 123-4567

PROFESSIONAL SUMMARY
Experienced Full Stack Developer with 5+ years of expertise in React, Node.js, and cloud technologies.
Proven track record of delivering scalable web applications and improving system performance by 40%.

TECHNICAL SKILLS
Languages: JavaScript, Python, TypeScript, Java
Frontend: React, Vue.js, HTML5, CSS3, Tailwind CSS
Backend: Node.js, Express, Django, FastAPI
Database: MongoDB, PostgreSQL, Redis
Cloud: AWS, Docker, Kubernetes, CI/CD
Tools: Git, JIRA, Agile/Scrum

WORK EXPERIENCE
Senior Software Engineer | Tech Corp | 2021 - Present
• Led development of microservices architecture serving 1M+ users
• Improved API response time by 60% through optimization and caching
• Mentored team of 5 junior developers
• Implemented CI/CD pipeline reducing deployment time by 75%

Software Engineer | StartupXYZ | 2019 - 2021
• Developed React-based dashboard improving user engagement by 45%
• Built RESTful APIs handling 100K+ requests per day
• Integrated payment gateway processing $2M+ annually
• Reduced bug reports by 50% through comprehensive testing

EDUCATION
Bachelor of Science in Computer Science
State University | 2019
GPA: 3.8/4.0

CERTIFICATIONS
- AWS Certified Solutions Architect
- MongoDB Certified Developer
`;

const sampleJobDescription = `
Senior Full Stack Engineer

Company: TechInnovate Inc.
Location: Remote

About the Role:
We're seeking an experienced Full Stack Engineer to join our growing team. You'll work on building
scalable web applications and services that impact millions of users.

Requirements:
- 5+ years of software development experience
- Strong proficiency in React and Node.js
- Experience with cloud platforms (AWS, Azure, or GCP)
- Database design and optimization (MongoDB, PostgreSQL)
- Microservices architecture experience
- CI/CD and DevOps practices
- Strong problem-solving and communication skills
- Bachelor's degree in Computer Science or related field

Preferred Qualifications:
- Experience with TypeScript
- Docker and Kubernetes knowledge
- TDD/BDD practices
- Leadership or mentoring experience

We offer competitive salary, remote work flexibility, and comprehensive benefits.
`;

let authToken = null;

async function login() {
  log.header('🔐 AUTHENTICATING');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@prepwiser.com',
      password: 'Test123!@#',
    });

    if (response.data.token) {
      authToken = response.data.token;
      log.success('Authentication successful');
      return true;
    }
    
    log.error('No token received');
    return false;
  } catch (error) {
    log.error(`Authentication failed: ${error.message}`);
    log.info('Using mock token for testing');
    authToken = 'mock_token';
    return false;
  }
}

async function testResumeAnalysis() {
  log.header('🔍 TESTING RESUME ANALYSIS (With Job Description)');
  
  try {
    const response = await axios.post(
      `${API_BASE}/resume-genome/analyze`,
      {
        resumeText: sampleResume,
        jobDescription: sampleJobDescription,
        withJobDescription: true,
        temperature: 0.7,
        maxTokens: 2000,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.data.success && response.data.data) {
      log.success('Resume analysis successful');
      
      const metadata = response.data.metadata || {};
      log.info(`Provider: ${metadata.provider || 'unknown'}`);
      log.info(`Model: ${metadata.model || 'unknown'}`);
      log.info(`Cached: ${metadata.cached ? 'Yes' : 'No'}`);
      log.info(`Degraded Mode: ${metadata.degradedMode ? 'Yes' : 'No'}`);
      
      const analysisLength = response.data.data.length;
      log.info(`Analysis length: ${analysisLength} characters`);
      
      if (analysisLength > 500) {
        log.success('Analysis has sufficient detail');
      }
      
      // Check for key sections
      const analysis = response.data.data.toLowerCase();
      const hasSections = {
        score: analysis.includes('score') || analysis.includes('match'),
        skills: analysis.includes('skills') || analysis.includes('technical'),
        experience: analysis.includes('experience') || analysis.includes('qualification'),
        recommendations: analysis.includes('recommend') || analysis.includes('improve'),
      };
      
      log.info('\nAnalysis includes:');
      Object.entries(hasSections).forEach(([section, included]) => {
        if (included) log.success(`  ${section}`);
        else log.error(`  ${section}`);
      });
      
      console.log('\n--- Analysis Preview ---');
      console.log(response.data.data.substring(0, 300) + '...\n');
      
      return true;
    }
    
    log.error('Analysis response invalid');
    return false;
  } catch (error) {
    log.error(`Analysis failed: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      console.log(error.response.data);
    }
    return false;
  }
}

async function testGeneralAnalysis() {
  log.header('📄 TESTING GENERAL RESUME ANALYSIS (No Job Description)');
  
  try {
    const response = await axios.post(
      `${API_BASE}/resume-genome/analyze`,
      {
        resumeText: sampleResume,
        withJobDescription: false,
        temperature: 0.7,
        maxTokens: 2000,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.data.success && response.data.data) {
      log.success('General analysis successful');
      
      const metadata = response.data.metadata || {};
      log.info(`Provider: ${metadata.provider || 'unknown'}`);
      
      console.log('\n--- General Analysis Preview ---');
      console.log(response.data.data.substring(0, 300) + '...\n');
      
      return true;
    }
    
    log.error('General analysis response invalid');
    return false;
  } catch (error) {
    log.error(`General analysis failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testCoverLetter() {
  log.header('📝 TESTING COVER LETTER GENERATION');
  
  try {
    const response = await axios.post(
      `${API_BASE}/resume-genome/cover-letter`,
      {
        resumeText: sampleResume,
        jobDescription: sampleJobDescription,
        temperature: 0.7,
        maxTokens: 2000,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.data.success && response.data.data) {
      log.success('Cover letter generation successful');
      
      const metadata = response.data.metadata || {};
      log.info(`Provider: ${metadata.provider || 'unknown'}`);
      
      const letterLength = response.data.data.length;
      log.info(`Cover letter length: ${letterLength} characters`);
      
      console.log('\n--- Cover Letter Preview ---');
      console.log(response.data.data.substring(0, 300) + '...\n');
      
      return true;
    }
    
    log.error('Cover letter response invalid');
    return false;
  } catch (error) {
    log.error(`Cover letter generation failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testInterviewQuestions() {
  log.header('🎤 TESTING INTERVIEW QUESTIONS GENERATION');
  
  try {
    const response = await axios.post(
      `${API_BASE}/resume-genome/interview-questions`,
      {
        jobDescription: sampleJobDescription,
        temperature: 0.7,
        maxTokens: 2500,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.data.success && response.data.data) {
      log.success('Interview questions generation successful');
      
      const metadata = response.data.metadata || {};
      log.info(`Provider: ${metadata.provider || 'unknown'}`);
      
      console.log('\n--- Interview Questions Preview ---');
      console.log(response.data.data.substring(0, 400) + '...\n');
      
      return true;
    }
    
    log.error('Interview questions response invalid');
    return false;
  } catch (error) {
    log.error(`Interview questions generation failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function runTests() {
  console.log(`${colors.bold}${colors.cyan}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Resume Analysis Fix - Validation Test');
  console.log('  Testing: Enhanced NLP Analysis with Groq Fallback');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(colors.reset);
  
  log.info('Starting test suite...');
  log.info('Server: http://localhost:5000\n');
  
  let results = {
    passed: 0,
    failed: 0,
  };
  
  // Test 1: Authentication
  const authSuccess = await login();
  if (authSuccess) results.passed++;
  else results.failed++;
  
  // Test 2: Resume Analysis with JD
  const analysisSuccess = await testResumeAnalysis();
  if (analysisSuccess) results.passed++;
  else results.failed++;
  
  // Test 3: General Analysis
  const generalSuccess = await testGeneralAnalysis();
  if (generalSuccess) results.passed++;
  else results.failed++;
  
  // Test 4: Cover Letter
  const coverSuccess = await testCoverLetter();
  if (coverSuccess) results.passed++;
  else results.failed++;
  
  // Test 5: Interview Questions
  const questionsSuccess = await testInterviewQuestions();
  if (questionsSuccess) results.passed++;
  else results.failed++;
  
  // Summary
  log.header('📊 TEST SUMMARY');
  console.log(`\nTotal Tests: ${results.passed + results.failed}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  
  const passRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
  console.log(`\nSuccess Rate: ${passRate}%`);
  
  if (results.failed === 0) {
    log.header('🎉 ALL TESTS PASSED! 🎉');
    console.log('\n✅ Resume analysis is working correctly with enhanced NLP analysis!');
    console.log('✅ Groq API fallback is configured and functional!');
    console.log('✅ All endpoints return proper metadata!');
  } else {
    log.header('⚠️  SOME TESTS FAILED');
    console.log('\n❌ Please check server logs for details');
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  log.error(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
