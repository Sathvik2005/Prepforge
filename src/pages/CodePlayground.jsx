import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, Download, Share2, Code2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const CodePlayground = () => {
  const [code, setCode] = useState(`// Write your code here
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

// Test
console.log(twoSum([2, 7, 11, 15], 9));`);
  const [output, setOutput] = useState('');
  const [showVisualizer, setShowVisualizer] = useState(true);
  const [executionSteps, setExecutionSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);

  const runCode = () => {
    try {
      // Capture console.log output
      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => {
        logs.push(args.join(' '));
      };

      // Execute code
      eval(code);

      // Restore console.log
      console.log = originalLog;

      setOutput(logs.join('\n') || 'Code executed successfully!');
      
      // Simulate execution steps for visualization
      simulateExecution();
      
      toast.success('Code executed successfully!');
    } catch (error) {
      setOutput(`Error: ${error.message}`);
      toast.error('Execution failed');
    }
  };

  const simulateExecution = () => {
    const steps = [
      {
        line: 2,
        variables: { nums: '[2, 7, 11, 15]', target: 9, map: '{}' },
        stack: ['twoSum'],
        description: 'Function called with nums and target',
      },
      {
        line: 3,
        variables: { nums: '[2, 7, 11, 15]', target: 9, map: '{}', i: 0 },
        stack: ['twoSum'],
        description: 'Loop iteration i=0, checking nums[0]=2',
      },
      {
        line: 4,
        variables: { nums: '[2, 7, 11, 15]', target: 9, map: '{2: 0}', i: 0, complement: 7 },
        stack: ['twoSum'],
        description: 'complement = 7, adding to map',
      },
      {
        line: 3,
        variables: { nums: '[2, 7, 11, 15]', target: 9, map: '{2: 0}', i: 1 },
        stack: ['twoSum'],
        description: 'Loop iteration i=1, checking nums[1]=7',
      },
      {
        line: 5,
        variables: { nums: '[2, 7, 11, 15]', target: 9, map: '{2: 0}', i: 1, complement: 2 },
        stack: ['twoSum'],
        description: 'complement = 2 found in map! Returning [0, 1]',
      },
    ];
    setExecutionSteps(steps);
    setCurrentStep(0);
  };

  const resetCode = () => {
    setCode('// Write your code here\n\n');
    setOutput('');
    setExecutionSteps([]);
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 text-navy-900 dark:text-white">
            Code <span className="text-royal-600">Playground</span>
          </h1>
          <p className="text-surface-600 dark:text-surface-400">Write, execute, and visualize your code</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Code Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center">
                <Code2 className="w-5 h-5 mr-2 text-blue-400" />
                Editor
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={runCode}
                  className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Run</span>
                </button>
                <button
                  onClick={resetCode}
                  className="px-4 py-2 rounded-lg glass hover:glass-strong transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button className="px-4 py-2 rounded-lg glass hover:glass-strong transition-all">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-[500px] p-4 rounded-xl glass text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              spellCheck={false}
            />

            {/* Output */}
            <div className="glass-strong rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-2 text-gray-400">Output</h3>
              <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap">
                {output || 'Run your code to see output...'}
              </pre>
            </div>
          </div>

          {/* Execution Visualizer */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Execution Visualizer</h2>
              <button
                onClick={() => setShowVisualizer(!showVisualizer)}
                className="px-4 py-2 rounded-lg glass hover:glass-strong transition-all flex items-center space-x-2"
              >
                {showVisualizer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showVisualizer ? 'Hide' : 'Show'}</span>
              </button>
            </div>

            {showVisualizer && executionSteps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Step Controls */}
                <div className="glass-strong rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-400">
                      Step {currentStep + 1} of {executionSteps.length}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                        className="px-3 py-1 rounded-lg glass hover:glass-strong transition-all disabled:opacity-50 text-sm"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentStep(Math.min(executionSteps.length - 1, currentStep + 1))}
                        disabled={currentStep === executionSteps.length - 1}
                        className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all disabled:opacity-50 text-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300">
                    {executionSteps[currentStep]?.description}
                  </p>
                </div>

                {/* Call Stack */}
                <div className="glass-strong rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3 text-purple-400">Call Stack</h3>
                  <div className="space-y-2">
                    {executionSteps[currentStep]?.stack.map((func, index) => (
                      <div key={index} className="px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-400/30 text-sm font-mono">
                        {func}()
                      </div>
                    ))}
                  </div>
                </div>

                {/* Variables */}
                <div className="glass-strong rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3 text-blue-400">Variables</h3>
                  <div className="space-y-2">
                    {Object.entries(executionSteps[currentStep]?.variables || {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center text-sm">
                        <span className="font-mono text-gray-400">{key}</span>
                        <span className="font-mono text-green-400">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Current Line */}
                <div className="glass-strong rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3 text-yellow-400">Current Line</h3>
                  <div className="px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-400/30 text-sm font-mono">
                    Line {executionSteps[currentStep]?.line}
                  </div>
                </div>
              </motion.div>
            )}

            {(!showVisualizer || executionSteps.length === 0) && (
              <div className="glass-strong rounded-xl p-12 text-center">
                <Code2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">
                  {executionSteps.length === 0
                    ? 'Run your code to see execution visualization'
                    : 'Visualizer hidden'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodePlayground;
