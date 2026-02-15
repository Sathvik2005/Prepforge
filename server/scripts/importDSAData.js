import axios from 'axios';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Question from '../models/Question.js';

// GitHub API configuration
const GITHUB_REPO = 'RATHOD-SHUBHAM/DataStructure-And-Algorithm';
const GITHUB_API_BASE = 'https://api.github.com';

// Categories/Topics mapping
const CATEGORY_MAP = {
  'NeetCode': 'blind-75',
  'Blind75': 'blind-75',
  'Striver': 'a2z-sheet',
  'LeetCode': 'sde-sheet',
  'AlgoExpert': 'sde-sheet',
};

const TOPIC_MAP = {
  'Array': 'Arrays',
  'String': 'Strings',
  'LinkedList': 'LinkedLists',
  'Tree': 'Trees',
  'Graph': 'Graphs',
  'Dp': 'DynamicProgramming',
  'Dynamic': 'DynamicProgramming',
  'Greedy': 'Greedy',
  'Sort': 'Sorting',
  'Search': 'Searching',
  'Binary': 'Searching',
};

/**
 * Fetch directory contents from GitHub
 */
async function fetchGitHubDirectory(path = '') {
  try {
    const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${path}`;
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching directory ${path}:`, error.message);
    return [];
  }
}

/**
 * Fetch file content from GitHub
 */
async function fetchFileContent(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching file:`, error.message);
    return null;
  }
}

/**
 * Parse Python file to extract question details
 */
function parsePythonFile(content, filePath) {
  const questions = [];
  
  // Extract problem title from path
  const pathParts = filePath.split('/');
  const fileName = pathParts[pathParts.length - 1];
  const problemFolder = pathParts[pathParts.length - 2];
  
  // Extract problem number and title
  const titleMatch = problemFolder.match(/(\d+)\.\s*(.+)/);
  const title = titleMatch ? titleMatch[2].trim() : problemFolder;
  const problemNumber = titleMatch ? parseInt(titleMatch[1]) : null;
  
  // Determine topic from path
  let topic = 'Arrays';
  for (const [key, value] of Object.entries(TOPIC_MAP)) {
    if (filePath.toLowerCase().includes(key.toLowerCase())) {
      topic = value;
      break;
    }
  }
  
  // Determine sheet category
  let sheetId = 'sde-sheet';
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (filePath.includes(key)) {
      sheetId = value;
      break;
    }
  }
  
  // Extract test cases from Python comments/main block
  const testCases = [];
  const testCaseRegex = /(?:if __name__|#\s*Test[^\n]*)\s*[:\n]+([\s\S]+?)(?=\n\n|$)/gi;
  let match;
  
  while ((match = testCaseRegex.exec(content)) !== null) {
    const testBlock = match[1];
    const inputMatches = testBlock.match(/=\s*\[([^\]]+)\]/g);
    const outputMatches = testBlock.match(/(?:Output|print|Result)[^\d]*([\d\[\],-\s]+)/gi);
    
    if (inputMatches && outputMatches && inputMatches.length > 0) {
      for (let i = 0; i < Math.min(inputMatches.length, outputMatches.length); i++) {
        testCases.push({
          input: inputMatches[i].replace(/=\s*/, '').trim(),
          output: outputMatches[i].replace(/(?:Output|print|Result)[:\s=]*/gi, '').trim(),
        });
      }
    }
  }
  
  // Extract solution/explanation from comments
  const commentRegex = /(?:'''|"""|#\s*)([\s\S]+?)(?:'''|"""|$)/g;
  let explanation = '';
  
  while ((match = commentRegex.exec(content)) !== null) {
    const comment = match[1].trim();
    if (comment.length > 50 && !comment.includes('User function Template')) {
      explanation = comment;
      break;
    }
  }
  
  // Determine difficulty
  let difficulty = 'medium';
  if (filePath.toLowerCase().includes('easy')) difficulty = 'easy';
  if (filePath.toLowerCase().includes('hard')) difficulty = 'hard';
  if (filePath.toLowerCase().includes('medium')) difficulty = 'medium';
  
  // Extract hints from comments
  const hints = [];
  const hintRegex = /(?:Hint|Approach|Intuition)[:\s]+(.*)/gi;
  while ((match = hintRegex.exec(content)) !== null) {
    hints.push(match[1].trim());
  }
  
  const question = {
    title: title,
    description: `Solve the ${title} problem using optimal approach.`,
    topic: topic,
    difficulty: difficulty,
    type: 'coding',
    testCases: testCases.length > 0 ? testCases : [
      { input: 'arr = [1, 2, 3, 4, 5]', output: 'Result depends on problem' }
    ],
    explanation: explanation || content.substring(0, 500),
    hints: hints.length > 0 ? hints : ['Think about the optimal approach', 'Consider time and space complexity'],
    tags: [sheetId, topic.toLowerCase(), `problem-${problemNumber || 'misc'}`],
    companies: ['Google', 'Amazon', 'Microsoft', 'Meta'],
    source: filePath,
    sheetId: sheetId,
  };
  
  return question;
}

/**
 * Recursively traverse GitHub repo and extract questions
 */
async function traverseAndExtract(dirPath = '', maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];
  
  console.log(`Traversing: ${dirPath || 'root'} (depth: ${currentDepth})`);
  
  const items = await fetchGitHubDirectory(dirPath);
  const questions = [];
  
  for (const item of items) {
    if (item.type === 'dir') {
      // Skip certain directories
      if (item.name.startsWith('.') || item.name === 'node_modules') continue;
      
      // Recursively traverse subdirectories
      const subQuestions = await traverseAndExtract(item.path, maxDepth, currentDepth + 1);
      questions.push(...subQuestions);
    } else if (item.type === 'file' && item.name.endsWith('.py')) {
      // Skip certain files
      if (item.name === '__init__.py' || item.name === 'ques.py') continue;
      
      console.log(`  Processing file: ${item.name}`);
      
      // Fetch and parse Python file
      const content = await fetchFileContent(item.download_url);
      if (content) {
        try {
          const question = parsePythonFile(content, item.path);
          if (question) {
            questions.push(question);
          }
        } catch (error) {
          console.error(`  Error parsing ${item.path}:`, error.message);
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return questions;
}

/**
 * Import questions to MongoDB
 */
async function importToDatabase(questions) {
  console.log(`\nImporting ${questions.length} questions to database...`);
  
  let imported = 0;
  let skipped = 0;
  
  for (const questionData of questions) {
    try {
      // Check if question already exists
      const existing = await Question.findOne({ title: questionData.title });
      
      if (!existing) {
        const question = new Question(questionData);
        await question.save();
        imported++;
        console.log(`  ✓ Imported: ${questionData.title}`);
      } else {
        skipped++;
        console.log(`  - Skipped (exists): ${questionData.title}`);
      }
    } catch (error) {
      console.error(`  ✗ Error importing ${questionData.title}:`, error.message);
    }
  }
  
  console.log(`\n✓ Import complete: ${imported} imported, ${skipped} skipped`);
}

/**
 * Main execution function
 */
async function main() {
  console.log('=== DSA Data Import from GitHub ===\n');
  
  // Connect to MongoDB
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prepwiser');
    console.log('✓ Connected to MongoDB\n');
  } catch (error) {
    console.error('✗ MongoDB connection error:', error.message);
    process.exit(1);
  }
  
  // Fetch and parse questions
  console.log('Fetching questions from GitHub...\n');
  
  const questions = [];
  
  // Target specific high-value directories
  const targetDirs = [
    'NeetCode',
    'Striver',
    'Blind75',
    'LeetCode/Problems',
    'AlgoExpert/CodingProb',
  ];
  
  for (const dir of targetDirs) {
    console.log(`\n--- Processing ${dir} ---`);
    const dirQuestions = await traverseAndExtract(dir, 3, 0);
    questions.push(...dirQuestions);
    console.log(`Found ${dirQuestions.length} questions in ${dir}`);
  }
  
  console.log(`\n=== Total questions found: ${questions.length} ===`);
  
  // Save to JSON for reference
  const outputPath = path.join(process.cwd(), 'dsa-questions.json');
  fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2));
  console.log(`\n✓ Saved to ${outputPath}`);
  
  // Import to database
  await importToDatabase(questions);
  
  // Close connection
  await mongoose.connection.close();
  console.log('\n✓ Database connection closed');
  console.log('\n=== Import Complete ===');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { traverseAndExtract, parsePythonFile, importToDatabase };
