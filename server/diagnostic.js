/**
 * Quick diagnostic script to test AI provider system
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

console.log('\n🔍 AI Provider Configuration Check\n');
console.log('═'.repeat(60));

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('Groq API Key:', process.env.GROQ_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('OpenRouter API Key:', process.env.OPENROUTER_API_KEY ? '✅ Configured' : '❌ Missing');

// Try to import AI provider
console.log('\n📦 Loading AI Provider Service...');
try {
  const { createChatCompletion, getQuotaStats, PROVIDERS } = await import('./services/aiProvider.js');
  console.log('✅ AI Provider service loaded successfully');
  
  // Check available providers
  console.log('\n🤖 Available Providers:');
  const stats = getQuotaStats();
  stats.availableProviders.forEach(provider => {
    console.log(`  ✅ ${provider}`);
  });
  
  if (stats.availableProviders.length === 0) {
    console.log('  ⚠️  No AI providers available - will use rule-based fallback only');
  }
  
  // Test rule-based fallback
  console.log('\n🧪 Testing Rule-Based Fallback...');
  const { analyzeResumeRuleBased } = await import('./services/featureDegradation.js');
  
  const testResume = 'John Doe\nSoftware Engineer\nSkills: JavaScript, React, Node.js';
  const result = analyzeResumeRuleBased(testResume, '');
  
  if (result && result.length > 50) {
    console.log('✅ Rule-based analysis working');
    console.log(`   Generated ${result.length} characters`);
  } else {
    console.log('❌ Rule-based analysis failed');
  }
  
  // Test simple AI call (if providers available)
  if (stats.availableProviders.length > 0) {
    console.log('\n🧪 Testing AI Provider Call...');
    try {
      const response = await createChatCompletion(
        [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "test successful" exactly.' }
        ],
        { max_tokens: 50, temperature: 0 },
        { feature: 'diagnostic-test' }
      );
      
      console.log(`✅ AI call successful via ${response.provider}`);
      console.log(`   Response: ${response.content.substring(0, 100)}...`);
    } catch (error) {
      console.log(`❌ AI call failed: ${error.message}`);
      console.log('   Will fall back to rule-based analysis');
    }
  }
  
  console.log('\n═'.repeat(60));
  console.log('✅ Diagnostic complete\n');
  
} catch (error) {
  console.error('❌ Error loading AI Provider:', error.message);
  console.error(error);
  process.exit(1);
}
