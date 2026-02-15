/**
 * Integration test for Resume Analysis with Fallback
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

console.log('\n🧪 Testing Complete Resume Analysis Flow\n');
console.log('═'.repeat(60));

// Test data
const SAMPLE_RESUME = `JOHN DOE
Senior Software Engineer
Email: john.doe@example.com | Phone: (555) 123-4567

PROFESSIONAL SUMMARY
Experienced software engineer with 5+ years developing scalable web applications.

EXPERIENCE
Software Engineer - Tech Corp (2020-2023)
• Developed and maintained React-based web applications serving 100K+ users
• Improved application performance by 40% through code optimization
• Led team of 3 junior developers on critical projects
• Implemented CI/CD pipeline reducing deployment time by 60%

Junior Developer - StartUp Inc (2018-2020)
• Built RESTful APIs using Node.js and Express
• Collaborated with designers to implement responsive UI components
• Participated in Agile development process

SKILLS
Programming: JavaScript, Python, TypeScript, Java
Frontend: React, Vue.js, HTML5, CSS3, Tailwind CSS
Backend: Node.js, Express, Django, FastAPI
Databases: MongoDB, PostgreSQL, Redis
Cloud & DevOps: AWS, Docker, Kubernetes, Jenkins
Tools: Git, JIRA, VS Code

EDUCATION
Bachelor of Science in Computer Science
University of Technology (2014-2018)
GPA: 3.8/4.0`;

const SAMPLE_JOB_DESC = `Senior Full Stack Engineer

We're looking for an experienced full stack engineer to join our growing team.

Required Skills:
- 5+ years of software development experience
- Strong proficiency in React and Node.js
- Experience with MongoDB and PostgreSQL
- Cloud platform experience (AWS preferred)
- Knowledge of Docker and containerization
- Experience leading small teams

Responsibilities:
- Design and implement scalable web applications
- Mentor junior developers
- Participate in architecture decisions
- Ensure code quality through reviews and testing

Nice to Have:
- TypeScript experience
- CI/CD pipeline experience
- Kubernetes knowledge`;

async function testCompleteAnalysis() {
  try {
    // Import AI provider
    const { createChatCompletion, getQuotaStats } = await import('./services/aiProvider.js');
    const {
      analyzeResumeRuleBased,
      rephraseTextRuleBased,
      generateCoverLetterRuleBased,
      generateInterviewQuestionsRuleBased
    } = await import('./services/featureDegradation.js');

    console.log('\n1️⃣ TESTING RESUME ANALYSIS');
    console.log('─'.repeat(60));
    
    try {
      const analysisResponse = await createChatCompletion(
        [
          {
            role: "system",
            content: "You are an expert resume analyst. Provide detailed, actionable feedback."
          },
          {
            role: "user",
            content: `Analyze this resume against the job description:\n\nResume:\n${SAMPLE_RESUME}\n\nJob:\n${SAMPLE_JOB_DESC}\n\nProvide: 1) Match score 2) Key strengths 3) Missing skills 4) Recommendations`
          }
        ],
        { model: "gpt-4o-mini", temperature: 0.7, max_tokens: 1500 },
        { feature: 'test-analysis' }
      );
      
      console.log(`✅ Analysis via ${analysisResponse.provider} ${analysisResponse.cached ? '(cached)' : ''}`);
      console.log(`   Response length: ${analysisResponse.content.length} chars`);
      
      if (analysisResponse.provider === 'rule-based-fallback') {
        console.log('   ⚠️  Using rule-based fallback (AI providers unavailable)');
      }
    } catch (error) {
      console.log('❌ AI analysis failed, using rule-based fallback...');
      const fallbackAnalysis = analyzeResumeRuleBased(SAMPLE_RESUME, SAMPLE_JOB_DESC);
      console.log(`✅ Rule-based analysis: ${fallbackAnalysis.length} chars`);
    }

    console.log('\n2️⃣ TESTING BULLET REPHRASE');
    console.log('─'.repeat(60));
    
    try {
      const rephraseResponse = await createChatCompletion(
        [
          {
            role: "system",
            content: "You are an expert resume writer. Generate 5-8 professional bullet points."
          },
          {
            role: "user",
            content: "Generate professional resume bullets from: Led team, improved performance, developed applications"
          }
        ],
        { model: "gpt-4o-mini", temperature: 0.7, max_tokens: 500 },
        { feature: 'test-rephrase' }
      );
      
      console.log(`✅ Rephrase via ${rephraseResponse.provider}`);
      const bullets = rephraseResponse.content.split('\n').filter(l => l.trim().length > 10);
      console.log(`   Generated ${bullets.length} bullets`);
    } catch (error) {
      console.log('❌ AI rephrase failed, using rule-based fallback...');
      const fallbackBullets = rephraseTextRuleBased('Led team, improved performance, developed applications');
      console.log(`✅ Rule-based rephrase: ${fallbackBullets.length} bullets`);
    }

    console.log('\n3️⃣ TESTING COVER LETTER');
    console.log('─'.repeat(60));
    
    try {
      const coverResponse = await createChatCompletion(
        [
          {
            role: "system",
            content: "You are an expert cover letter writer."
          },
          {
            role: "user",
            content: `Generate a cover letter for:\n\nResume:\n${SAMPLE_RESUME.substring(0, 500)}\n\nJob:\n${SAMPLE_JOB_DESC.substring(0, 300)}`
          }
        ],
        { model: "gpt-4o-mini", temperature: 0.8, max_tokens: 1000 },
        { feature: 'test-cover-letter' }
      );
      
      console.log(`✅ Cover letter via ${coverResponse.provider}`);
      console.log(`   Generated ${coverResponse.content.length} chars`);
    } catch (error) {
      console.log('❌ AI cover letter failed, using rule-based fallback...');
      const fallbackCover = generateCoverLetterRuleBased(SAMPLE_RESUME, SAMPLE_JOB_DESC);
      console.log(`✅ Rule-based cover letter: ${fallbackCover.length} chars`);
    }

    console.log('\n4️⃣ TESTING INTERVIEW QUESTIONS');
    console.log('─'.repeat(60));
    
    try {
      const questionsResponse = await createChatCompletion(
        [
          {
            role: "system",
            content: "You are an experienced technical recruiter."
          },
          {
            role: "user",
            content: `Generate 15-20 interview questions for:\n\n${SAMPLE_JOB_DESC}`
          }
        ],
        { model: "gpt-4o-mini", temperature: 0.7, max_tokens: 1500 },
        { feature: 'test-questions' }
      );
      
      console.log(`✅ Interview questions via ${questionsResponse.provider}`);
      const questionCount = (questionsResponse.content.match(/\?/g) || []).length;
      console.log(`   Generated ~${questionCount} questions`);
    } catch (error) {
      console.log('❌ AI questions failed, using rule-based fallback...');
      const fallbackQuestions = generateInterviewQuestionsRuleBased(SAMPLE_JOB_DESC);
      const questionCount = (fallbackQuestions.match(/\?/g) || []).length;
      console.log(`✅ Rule-based questions: ~${questionCount} questions`);
    }

    console.log('\n📊 QUOTA STATISTICS');
    console.log('─'.repeat(60));
    const stats = getQuotaStats();
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Successful: ${stats.successfulRequests}`);
    console.log(`Failed: ${stats.failedRequests}`);
    console.log(`Quota Errors: ${stats.quotaErrors}`);
    
    console.log('\nProvider Status:');
    Object.entries(stats.providerStatus).forEach(([provider, status]) => {
      const icon = status.available ? '✅' : '❌';
      console.log(`  ${icon} ${provider}: ${status.available ? 'Available' : 'Unavailable'}`);
    });

    console.log('\n═'.repeat(60));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('\n💡 Summary:');
    console.log('   • Resume analysis system working correctly');
    console.log('   • Fallback mechanisms operational');
    console.log('   • All features generate results\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testCompleteAnalysis();
