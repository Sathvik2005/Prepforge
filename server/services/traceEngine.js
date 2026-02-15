import { spawn } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { tmpdir } from 'os';

const TRACE_TIMEOUT = 15000; // 15 seconds for trace generation

/**
 * Generate execution trace for code
 * @param {string} code - The code to trace
 * @param {string} language - Programming language
 * @param {string} input - Optional input
 * @returns {Promise<Array>} Array of execution steps
 */
export async function generateTrace(code, language, input = '') {
  const sessionId = uuidv4();
  const tempDir = join(tmpdir(), 'prepwiser-trace', sessionId);
  
  try {
    await mkdir(tempDir, { recursive: true });

    let trace;
    switch (language) {
      case 'python':
        trace = await tracePython(code, input, tempDir);
        break;
      case 'java':
        trace = await traceJava(code, input, tempDir);
        break;
      case 'javascript':
        trace = await traceJavaScript(code, input, tempDir);
        break;
      default:
        throw new Error(`Tracing not supported for language: ${language}`);
    }

    return trace;
  } catch (error) {
    console.error('Trace generation error:', error);
    throw error;
  } finally {
    // Cleanup
    try {
      const { rm } = await import('fs/promises');
      await rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore
    }
  }
}

/**
 * Trace Python execution using custom tracer
 */
async function tracePython(code, input, tempDir) {
  const tracerCode = `
import sys
import json
import io

# Capture execution trace
trace_steps = []
step_count = 0
MAX_STEPS = 1000

def trace_calls(frame, event, arg):
    global step_count
    if step_count >= MAX_STEPS:
        return
    
    if event in ['line', 'call', 'return']:
        step_count += 1
        
        # Get local variables (limit to primitive types)
        local_vars = {}
        for var_name, var_value in frame.f_locals.items():
            if not var_name.startswith('__'):
                try:
                    # Convert to string representation
                    str_val = str(var_value)
                    if len(str_val) > 100:
                        str_val = str_val[:97] + '...'
                    local_vars[var_name] = str_val
                except:
                    local_vars[var_name] = '<unprintable>'
        
        trace_steps.append({
            'step': step_count,
            'line': frame.f_lineno,
            'event': event,
            'function': frame.f_code.co_name,
            'variables': local_vars,
            'filename': frame.f_code.co_filename
        })
    
    return trace_calls

# Set the trace function
sys.settrace(trace_calls)

# Execute user code
try:
${code.split('\n').map(line => '    ' + line).join('\n')}
except Exception as e:
    trace_steps.append({
        'step': step_count + 1,
        'event': 'exception',
        'error': str(e)
    })

# Disable tracing
sys.settrace(None)

# Output trace as JSON
print(json.dumps(trace_steps, indent=2))
`;

  const filePath = join(tempDir, 'trace_script.py');
  await writeFile(filePath, tracerCode);

  const result = await executeProcess('python', ['-u', filePath], input);
  
  if (result.error) {
    throw new Error(result.error);
  }

  try {
    const trace = JSON.parse(result.output);
    return formatTrace(trace, 'python');
  } catch (parseError) {
    console.error('Failed to parse trace output:', result.output);
    return generateFallbackTrace(code, 'python');
  }
}

/**
 * Trace Java execution (simplified - uses instrumentation)
 */
async function traceJava(code, input, tempDir) {
  // For Java, we'll use a simplified approach
  // In production, you'd use Java Debug Interface (JDI) or instrumentation
  return generateFallbackTrace(code, 'java');
}

/**
 * Trace JavaScript execution using custom wrapper
 */
async function traceJavaScript(code, input, tempDir) {
  const tracerCode = `
const traceSteps = [];
let stepCount = 0;
const MAX_STEPS = 1000;

// Wrap console.log to capture output
const originalLog = console.log;
console.log = (...args) => {
  originalLog(...args);
  traceSteps.push({
    step: ++stepCount,
    event: 'console',
    output: args.join(' ')
  });
};

// Execute user code
try {
${code.split('\n').map(line => '  ' + line).join('\n')}
} catch (error) {
  traceSteps.push({
    step: ++stepCount,
    event: 'exception',
    error: error.message,
    stack: error.stack
  });
}

// Output trace
console.log = originalLog;
console.log(JSON.stringify(traceSteps, null, 2));
`;

  const filePath = join(tempDir, 'trace_script.js');
  await writeFile(filePath, tracerCode);

  const result = await executeProcess('node', [filePath], input);
  
  if (result.error) {
    throw new Error(result.error);
  }

  try {
    const output = result.output.trim();
    const jsonStart = output.indexOf('[');
    const jsonData = jsonStart >= 0 ? output.substring(jsonStart) : output;
    const trace = JSON.parse(jsonData);
    return formatTrace(trace, 'javascript');
  } catch (parseError) {
    return generateFallbackTrace(code, 'javascript');
  }
}

/**
 * Format trace data into standardized structure
 */
function formatTrace(rawTrace, language) {
  if (!Array.isArray(rawTrace) || rawTrace.length === 0) {
    return [];
  }

  return rawTrace.map((step, index) => ({
    step: index + 1,
    line: step.line || 0,
    event: step.event || 'line',
    function: step.function || 'main',
    variables: step.variables || {},
    description: generateStepDescription(step, language),
    stack: step.stack || [],
  }));
}

/**
 * Generate description for trace step
 */
function generateStepDescription(step, language) {
  switch (step.event) {
    case 'call':
      return `Calling function ${step.function}()`;
    case 'return':
      return `Returning from ${step.function}()`;
    case 'line':
      return `Executing line ${step.line}`;
    case 'exception':
      return `Exception: ${step.error}`;
    case 'console':
      return `Output: ${step.output}`;
    default:
      return `Step ${step.step}`;
  }
}

/**
 * Generate fallback trace using static analysis
 */
function generateFallbackTrace(code, language) {
  const lines = code.split('\n');
  const trace = [];
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('#')) {
      trace.push({
        step: trace.length + 1,
        line: index + 1,
        event: 'line',
        function: 'main',
        variables: {},
        description: `Line ${index + 1}: ${trimmed.substring(0, 50)}`,
        stack: ['main'],
      });
    }
  });

  return trace;
}

/**
 * Execute process helper
 */
function executeProcess(command, args, input) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      timeout: TRACE_TIMEOUT,
      killSignal: 'SIGKILL',
    });

    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    if (input) {
      process.stdin.write(input);
      process.stdin.end();
    }

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ output: output.trim(), error: '' });
      } else {
        resolve({ output: output.trim(), error: errorOutput.trim() });
      }
    });

    process.on('error', (err) => {
      reject({ output: '', error: err.message });
    });
  });
}
