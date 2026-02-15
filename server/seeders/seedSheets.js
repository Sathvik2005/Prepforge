#!/usr/bin/env node

/**
 * MongoDB Seed Script for DSA Sheets
 * 
 * This script seeds the database with DSA sheet data from JSON files.
 * Run: node server/seeders/seedSheets.js
 */

import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES Module dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import Sheet model
import Sheet from '../models/Sheet.js';

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepwiser';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logSuccess('Connected to MongoDB');
  } catch (error) {
    logError(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Read all JSON files from sheets directory
 */
function readSheetFiles() {
  const sheetsDir = path.resolve(__dirname, '../data/sheets');
  
  if (!fs.existsSync(sheetsDir)) {
    logError(`Sheets directory not found: ${sheetsDir}`);
    return [];
  }

  const files = fs.readdirSync(sheetsDir).filter(file => file.endsWith('.json'));
  
  if (files.length === 0) {
    logWarning('No JSON files found in sheets directory');
    return [];
  }

  logInfo(`Found ${files.length} sheet file(s)`);
  
  const sheets = [];
  
  for (const file of files) {
    try {
      const filePath = path.join(sheetsDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const sheetData = JSON.parse(fileContent);
      sheets.push(sheetData);
      logInfo(`  - Loaded: ${file}`);
    } catch (error) {
      logError(`  - Failed to load ${file}: ${error.message}`);
    }
  }
  
  return sheets;
}

/**
 * Validate sheet data
 */
function validateSheet(sheet) {
  const errors = [];
  
  if (!sheet.title) errors.push('Missing title');
  if (!sheet.slug) errors.push('Missing slug');
  if (!sheet.sections || !Array.isArray(sheet.sections)) errors.push('Missing or invalid sections array');
  if (sheet.sections && !sheet.sections.length) errors.push('Empty sections array');
  
  if (sheet.sections) {
    sheet.sections.forEach((section, i) => {
      if (!section.title) errors.push(`Section ${i}: Missing title`);
      if (!section.slug) errors.push(`Section ${i}: Missing slug`);
      if (!section.problems || !Array.isArray(section.problems)) {
        errors.push(`Section ${i}: Missing or invalid problems array`);
      } else if (!section.problems.length) {
        errors.push(`Section ${i}: Empty problems array`);
      }
      
      if (section.problems) {
        section.problems.forEach((problem, j) => {
          if (!problem.title) errors.push(`Section ${i}, Problem ${j}: Missing title`);
          if (!problem.slug) errors.push(`Section ${i}, Problem ${j}: Missing slug`);
          if (!problem.difficulty) errors.push(`Section ${i}, Problem ${j}: Missing difficulty`);
          if (!['Easy', 'Medium', 'Hard'].includes(problem.difficulty)) {
            errors.push(`Section ${i}, Problem ${j}: Invalid difficulty "${problem.difficulty}"`);
          }
        });
      }
    });
  }
  
  return errors;
}

/**
 * Seed a single sheet
 */
async function seedSheet(sheetData) {
  try {
    // Validate sheet data
    const validationErrors = validateSheet(sheetData);
    if (validationErrors.length > 0) {
      logError(`Validation failed for "${sheetData.title}":`);
      validationErrors.forEach(err => logError(`  - ${err}`));
      return false;
    }

    // Calculate total problems
    const totalProblems = sheetData.sections.reduce((sum, section) => 
      sum + (section.problems ? section.problems.length : 0), 0
    );
    sheetData.totalProblems = totalProblems;

    // Check if sheet already exists
    const existingSheet = await Sheet.findOne({ slug: sheetData.slug });
    
    if (existingSheet) {
      // Update existing sheet
      logInfo(`Updating existing sheet: "${sheetData.title}"`);
      await Sheet.findOneAndUpdate(
        { slug: sheetData.slug },
        sheetData,
        { new: true, runValidators: true }
      );
      logSuccess(`Updated: "${sheetData.title}" (${totalProblems} problems)`);
    } else {
      // Create new sheet
      logInfo(`Creating new sheet: "${sheetData.title}"`);
      await Sheet.create(sheetData);
      logSuccess(`Created: "${sheetData.title}" (${totalProblems} problems)`);
    }

    return true;
  } catch (error) {
    logError(`Failed to seed "${sheetData.title}": ${error.message}`);
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        logError(`  - ${key}: ${error.errors[key].message}`);
      });
    }
    return false;
  }
}

/**
 * Main seeder function
 */
async function seedDatabase() {
  log('\n' + '='.repeat(60), 'cyan');
  log('  DSA Sheets Database Seeder', 'bright');
  log('='.repeat(60) + '\n', 'cyan');

  try {
    // Connect to database
    await connectDB();

    // Read sheet files
    log('\n📂 Reading sheet files...', 'cyan');
    const sheets = readSheetFiles();

    if (sheets.length === 0) {
      logWarning('No sheets to seed. Exiting...');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Seed sheets
    log('\n🌱 Seeding sheets into database...', 'cyan');
    let successCount = 0;
    let failCount = 0;

    for (const sheet of sheets) {
      const success = await seedSheet(sheet);
      if (success) successCount++;
      else failCount++;
    }

    // Summary
    log('\n' + '='.repeat(60), 'cyan');
    log('  Seeding Summary', 'bright');
    log('='.repeat(60), 'cyan');
    logSuccess(`Successfully seeded: ${successCount} sheet(s)`);
    if (failCount > 0) {
      logError(`Failed to seed: ${failCount} sheet(s)`);
    }
    
    // Count total documents
    const totalSheets = await Sheet.countDocuments();
    logInfo(`Total sheets in database: ${totalSheets}`);
    
    // List all sheets
    const allSheets = await Sheet.find({}).select('title slug totalProblems type');
    log('\n📋 Sheets in database:', 'cyan');
    allSheets.forEach(sheet => {
      log(`  • ${sheet.title} (${sheet.slug}): ${sheet.totalProblems} problems [${sheet.type}]`, 'magenta');
    });

    log('\n' + '='.repeat(60) + '\n', 'cyan');
    logSuccess('Database seeding completed! 🎉');

  } catch (error) {
    logError(`\nSeeding failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logInfo('\nDatabase connection closed');
  }
}

// Run seeder
seedDatabase();
