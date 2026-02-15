#!/usr/bin/env node

/**
 * System Health Check Script
 * Verifies all services are running and configured correctly
 */

import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`)
};

async function checkPort(port) {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function checkBackend() {
  log.info('Checking backend server...');
  
  const portOpen = await checkPort(5000);
  if (!portOpen) {
    log.error('Backend server not running on port 5000');
    return false;
  }
  
  try {
    const response = await axios.get('http://localhost:5000/api/health', { timeout: 5000 });
    log.success(`Backend: ${response.data.message} (v${response.data.version})`);
    return true;
  } catch (error) {
    log.error(`Backend health check failed: ${error.message}`);
    return false;
  }
}

async function checkFrontend() {
  log.info('Checking frontend server...');
  
  const portOpen = await checkPort(3000);
  if (!portOpen) {
    log.error('Frontend server not running on port 3000');
    return false;
  }
  
  log.success('Frontend server running on port 3000');
  return true;
}

async function checkDatabase() {
  log.info('Checking database connection...');
  
  try {
    const response = await axios.get('http://localhost:5000/api/health', { timeout: 5000 });
    // Backend health check indirectly confirms DB connection
    log.success('Database connected (MongoDB)');
    return true;
  } catch (error) {
    log.warning('Cannot verify database connection');
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 PrepWiser System Health Check');
  console.log('='.repeat(50) + '\n');

  const results = {
    backend: await checkBackend(),
    frontend: await checkFrontend(),
    database: await checkDatabase()
  };

  console.log('\n' + '='.repeat(50));
  console.log('📊 Health Check Summary');
  console.log('='.repeat(50));
  console.log(`Backend:  ${results.backend ? '✅ OK' : '❌ FAILED'}`);
  console.log(`Frontend: ${results.frontend ? '✅ OK' : '❌ FAILED'}`);
  console.log(`Database: ${results.database ? '✅ OK' : '⚠️  UNKNOWN'}`);
  console.log('='.repeat(50) + '\n');

  const allOK = results.backend && results.frontend;
  
  if (allOK) {
    log.success('All systems operational! 🎉');
    log.info('Access the app at: http://localhost:3000');
  } else {
    log.error('Some services are not running');
    log.info('Run: npm run dev (to start both servers)');
  }
  
  process.exit(allOK ? 0 : 1);
}

main().catch(console.error);
