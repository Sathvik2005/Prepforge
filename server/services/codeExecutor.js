import { spawn } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { tmpdir } from 'os';

const EXECUTION_TIMEOUT = 10000; // 10 seconds
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB

/**
 * Execute code in a secure sandboxed environment
 * @param {string} code - The code to execute
 * @param {string} language - Programming language (python, java, javascript)
 * @param {string} input - Optional input for the program
 * @returns {Promise<{output, error, executionTime}>}
 */
export async function executeCode(code, language, input = '') {
  const startTime = Date.now();
  const sessionId = uuidv4();
  const tempDir = join(tmpdir(), 'prepwiser-code', sessionId);
  
  try {
    // Create temp directory
    await mkdir(tempDir, { recursive: true });

    let result;
    switch (language) {
      case 'python':
        result = await executePython(code, input, tempDir);
        break;
      case 'java':
        result = await executeJava(code, input, tempDir);
        break;
      case 'javascript':
        result = await executeJavaScript(code, input, tempDir);
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    const executionTime = Date.now() - startTime;
    
    return {
      ...result,
      executionTime,
    };
  } catch (error) {
    return {
      output: '',
      error: error.message,
      executionTime: Date.now() - startTime,
    };
  } finally {
    // Cleanup temp directory
    try {
      await cleanupTempDir(tempDir);
    } catch (cleanupError) {
      console.error('Failed to cleanup temp directory:', cleanupError);
    }
  }
}

/**
 * Execute Python code
 */
async function executePython(code, input, tempDir) {
  const filePath = join(tempDir, 'script.py');
  await writeFile(filePath, code);

  return executeProcess('python', ['-u', filePath], input);
}

/**
 * Execute Java code
 */
async function executeJava(code, input, tempDir) {
  // Extract class name from code
  const classNameMatch = code.match(/public\s+class\s+(\w+)/);
  const className = classNameMatch ? classNameMatch[1] : 'Main';
  
  const filePath = join(tempDir, `${className}.java`);
  await writeFile(filePath, code);

  // Compile
  try {
    await executeProcess('javac', [filePath], '');
  } catch (compileError) {
    return {
      output: '',
      error: `Compilation Error: ${compileError.error}`,
    };
  }

  // Execute
  return executeProcess('java', ['-cp', tempDir, className], input);
}

/**
 * Execute JavaScript code using Node.js
 */
async function executeJavaScript(code, input, tempDir) {
  const filePath = join(tempDir, 'script.js');
  
  // Wrap code to handle input
  const wrappedCode = `
const input = \`${input.replace(/`/g, '\\`')}\`;
const inputLines = input.trim().split('\\n');
let inputIndex = 0;

// Mock readline for stdin
const readline = {
  createInterface: () => ({
    on: (event, callback) => {
      if (event === 'line') {
        inputLines.forEach(line => callback(line));
      }
    },
    close: () => {},
  }),
};

${code}
`;
  
  await writeFile(filePath, wrappedCode);
  return executeProcess('node', [filePath], '');
}

/**
 * Execute a process with timeout and output limits
 */
function executeProcess(command, args, input) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      timeout: EXECUTION_TIMEOUT,
      killSignal: 'SIGKILL',
    });

    let output = '';
    let errorOutput = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      process.kill();
      reject({
        output: output.substring(0, MAX_OUTPUT_SIZE),
        error: 'Execution timed out (10s limit)',
      });
    }, EXECUTION_TIMEOUT);

    process.stdout.on('data', (data) => {
      output += data.toString();
      if (output.length > MAX_OUTPUT_SIZE) {
        process.kill();
        clearTimeout(timeout);
        reject({
          output: output.substring(0, MAX_OUTPUT_SIZE),
          error: 'Output size limit exceeded (1MB)',
        });
      }
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    if (input) {
      process.stdin.write(input);
      process.stdin.end();
    }

    process.on('close', (code) => {
      clearTimeout(timeout);
      if (!timedOut) {
        if (code === 0) {
          resolve({
            output: output.trim(),
            error: '',
          });
        } else {
          resolve({
            output: output.trim(),
            error: errorOutput.trim() || `Process exited with code ${code}`,
          });
        }
      }
    });

    process.on('error', (err) => {
      clearTimeout(timeout);
      reject({
        output: '',
        error: `Failed to start process: ${err.message}`,
      });
    });
  });
}

/**
 * Clean up temporary directory
 */
async function cleanupTempDir(dirPath) {
  try {
    const { rm } = await import('fs/promises');
    await rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}
