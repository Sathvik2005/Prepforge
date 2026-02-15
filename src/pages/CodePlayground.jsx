import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { 
  Play, RotateCcw, Download, Share2, Code2, Eye, EyeOff, 
  Zap, Brain, TrendingUp, ChevronRight, ChevronLeft,
  AlertCircle, CheckCircle, Loader, FileCode
} from 'lucide-react';
import { showSuccess, showError, showWarning } from '../utils/toast';
import { getAuthHeaders } from '../utils/auth';
import axios from 'axios';

const EXAMPLE_CODE = {
  python: `def two_sum(nums, target):
    """
    Find two numbers that add up to target.
    Time: O(n), Space: O(n)
    """
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Test
print(two_sum([2, 7, 11, 15], 9))`,

  java: `public class Solution {
    /**
     * Two Sum - Hash Map Approach
     * Time: O(n), Space: O(n)
     */
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] {map.get(complement), i};
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
    
    public static void main(String[] args) {
        Solution sol = new Solution();
        int[] result = sol.twoSum(new int[]{2, 7, 11, 15}, 9);
        System.out.println(Arrays.toString(result));
    }
}`,

  javascript: `/**
 * Two Sum - Hash Map Approach
 * Time: O(n), Space: O(n)
 */
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
console.log(twoSum([2, 7, 11, 15], 9));`,
};

const CodePlayground = () => {
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(EXAMPLE_CODE.python);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(true);
  const [activePanel, setActivePanel] = useState('output'); // output, trace, complexity, explanation
  
  // Execution data
  const [executionData, setExecutionData] = useState(null);
  const [traceData, setTraceData] = useState(null);
  const [complexityData, setComplexityData] = useState(null);
  const [explanationData, setExplanationData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Loading states
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [loadingComplexity, setLoadingComplexity] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  
  const editorRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Configure editor theme
    monaco.editor.defineTheme('prepwiser-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0f172a',
      },
    });
    monaco.editor.setTheme('prepwiser-dark');
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode(EXAMPLE_CODE[newLang]);
    resetData();
  };

  const resetData = () => {
    setOutput('');
    setExecutionData(null);
    setTraceData(null);
    setComplexityData(null);
    setExplanationData(null);
    setCurrentStep(0);
  };

  const runCode = async () => {
    if (!code.trim()) {
      showWarning('Please write some code first');
      return;
    }

    setIsExecuting(true);
    setActivePanel('output');
    
    try {
      const response = await axios.post(
        `${API_BASE}/code-execution/execute`,
        { code, language, input },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        setExecutionData(response.data);
        setOutput(response.data.output || 'Code executed successfully with no output');
        showSuccess(`Executed in ${response.data.executionTime}ms`);
        
        if (response.data.error) {
          setOutput(`Error:\n${response.data.error}`);
          showError('Execution failed');
        }
      }
    } catch (error) {
      setOutput(`Error: ${error.response?.data?.error || error.message}`);
      showError('Execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const generateTrace = async () => {
    if (!code.trim()) {
      showWarning('Please write some code first');
      return;
    }

    setLoadingTrace(true);
    setActivePanel('trace');
    
    try {
      const response = await axios.post(
        `${API_BASE}/code-execution/trace`,
        { code, language, input },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        setTraceData(response.data.trace);
        setCurrentStep(0);
        showSuccess(`Generated ${response.data.trace.length} execution steps`);
      }
    } catch (error) {
      showError('Failed to generate trace');
      console.error('Trace error:', error);
    } finally {
      setLoadingTrace(false);
    }
  };

  const analyzeComplexity = async () => {
    if (!code.trim()) {
      showWarning('Please write some code first');
      return;
    }

    setLoadingComplexity(true);
    setActivePanel('complexity');
    
    try {
      const response = await axios.post(
        `${API_BASE}/code-execution/analyze`,
        { code, language },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        setComplexityData(response.data.analysis);
        showSuccess('Complexity analysis complete');
      }
    } catch (error) {
      showError('Failed to analyze complexity');
      console.error('Analysis error:', error);
    } finally {
      setLoadingComplexity(false);
    }
  };

  const explainCode = async (mode = 'beginner') => {
    if (!code.trim()) {
      showWarning('Please write some code first');
      return;
    }

    setLoadingExplanation(true);
    setActivePanel('explanation');
    
    try {
      const response = await axios.post(
        `${API_BASE}/code-execution/explain`,
        { code, language, mode },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        setExplanationData(response.data.explanation);
        showSuccess('AI explanation generated');
      }
    } catch (error) {
      showError('Failed to generate explanation');
      console.error('Explanation error:', error);
    } finally {
      setLoadingExplanation(false);
    }
  };

  const resetCode = () => {
    setCode(EXAMPLE_CODE[language]);
    setInput('');
    resetData();
    showSuccess('Reset to example code');
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="container mx-auto max-w-[1800px]">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-4xl font-bold mb-2 text-navy-900 dark:text-white">
            Code <span className="text-royal-600">Playground</span>
          </h1>
          <p className="text-surface-600 dark:text-surface-400">
            Write, execute, trace, and analyze your code with AI-powered insights
          </p>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* LEFT PANEL - Editor */}
          <div className="space-y-4">
            {/* Language Selector & Actions */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-2">
                {['python', 'java', 'javascript'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      language === lang
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                        : 'glass hover:glass-strong text-gray-400'
                    }`}
                  >
                    {lang === 'javascript' ? 'JavaScript' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </button>
                ))}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={runCode}
                  disabled={isExecuting}
                  className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {isExecuting ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>{isExecuting ? 'Running...' : 'Run'}</span>
                </button>
                <button
                  onClick={resetCode}
                  className="px-4 py-2 rounded-lg glass hover:glass-strong transition-all"
                  title="Reset to example"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Monaco Editor */}
            <div className="glass-strong rounded-xl overflow-hidden" style={{ height: '500px' }}>
              <Editor
                height="100%"
                language={language}
                value={code}
                onChange={(value) => setCode(value || '')}
                onMount={handleEditorDidMount}
                theme="prepwiser-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: language === 'python' ? 4 : 2,
                  wordWrap: 'on',
                }}
              />
            </div>

            {/* Input Section */}
            <div className="glass-strong rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-2 text-gray-400 flex items-center">
                <FileCode className="w-4 h-4 mr-2" />
                Program Input (Optional)
              </h3>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter input for your program (one value per line)..."
                className="w-full h-20 p-3 rounded-lg bg-navy-900/50 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* RIGHT PANEL - Analysis */}
          <div className="space-y-4">
            {/* Panel Tabs */}
            <div className="flex items-center space-x-2 overflow-x-auto">
              <button
                onClick={() => setActivePanel('output')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activePanel === 'output'
                    ? 'bg-green-500/20 text-green-400 border border-green-400/30'
                    : 'glass hover:glass-strong text-gray-400'
                }`}
              >
                Output
              </button>
              <button
                onClick={generateTrace}
                disabled={loadingTrace}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center space-x-2 ${
                  activePanel === 'trace'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-400/30'
                    : 'glass hover:glass-strong text-gray-400'
                }`}
              >
                {loadingTrace ? <Loader className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                <span>Trace</span>
              </button>
              <button
                onClick={analyzeComplexity}
                disabled={loadingComplexity}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center space-x-2 ${
                  activePanel === 'complexity'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30'
                    : 'glass hover:glass-strong text-gray-400'
                }`}
              >
                {loadingComplexity ? <Loader className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
                <span>Complexity</span>
              </button>
              <button
                onClick={() => explainCode('beginner')}
                disabled={loadingExplanation}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center space-x-2 ${
                  activePanel === 'explanation'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                    : 'glass hover:glass-strong text-gray-400'
                }`}
              >
                {loadingExplanation ? <Loader className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                <span>AI Explain</span>
              </button>
            </div>

            {/* Panel Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activePanel}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="glass-strong rounded-xl p-4 min-h-[600px]"
              >
                {activePanel === 'output' && <OutputPanel output={output} executionData={executionData} />}
                {activePanel === 'trace' && (
                  <TracePanel 
                    traceData={traceData} 
                    currentStep={currentStep} 
                    setCurrentStep={setCurrentStep}
                    loading={loadingTrace}
                  />
                )}
                {activePanel === 'complexity' && <ComplexityPanel data={complexityData} loading={loadingComplexity} />}
                {activePanel === 'explanation' && (
                  <ExplanationPanel 
                    data={explanationData} 
                    loading={loadingExplanation}
                    onModeChange={explainCode}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

// Output Panel Component
const OutputPanel = ({ output, executionData }) => (
  <div className="h-full flex flex-col">
    <h3 className="text-lg font-semibold mb-3 text-green-400 flex items-center">
      <CheckCircle className="w-5 h-5 mr-2" />
      Execution Output
    </h3>
    {executionData && (
      <div className="text-xs text-gray-400 mb-2">
        Execution time: {executionData.executionTime}ms
      </div>
    )}
    <pre className="flex-1 text-sm font-mono text-green-400 whitespace-pre-wrap overflow-auto p-4 bg-navy-900/50 rounded-lg">
      {output || 'Run your code to see output...'}
    </pre>
  </div>
);

// Trace Panel Component
const TracePanel = ({ traceData, currentStep, setCurrentStep, loading }) => {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!traceData || traceData.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <Zap className="w-12 h-12 mb-4 opacity-50" />
        <p>Click "Trace" to generate step-by-step execution</p>
      </div>
    );
  }

  const step = traceData[currentStep];

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-purple-400 flex items-center">
          <Zap className="w-5 h-5 mr-2" />
          Execution Trace
        </h3>
        <span className="text-sm text-gray-400">
          Step {currentStep + 1} / {traceData.length}
        </span>
      </div>

      {/* Step Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="px-3 py-2 rounded-lg glass hover:glass-strong transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 bg-navy-900/50 rounded-lg h-2">
          <div
            className="bg-purple-500 h-full rounded-lg transition-all"
            style={{ width: `${((currentStep + 1) / traceData.length) * 100}%` }}
          />
        </div>
        <button
          onClick={() => setCurrentStep(Math.min(traceData.length - 1, currentStep + 1))}
          disabled={currentStep === traceData.length - 1}
          className="px-3 py-2 rounded-lg glass hover:glass-strong transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Current Step Info */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        <div className="glass rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Description</div>
          <div className="text-sm text-white">{step.description}</div>
        </div>

        <div className="glass rounded-lg p-3">
          <div className="text-xs text-yellow-400 mb-2">Line {step.line} | {step.event}</div>
          <div className="text-xs text-gray-400">Function: {step.function || 'main'}</div>
        </div>

        {step.variables && Object.keys(step.variables).length > 0 && (
          <div className="glass rounded-lg p-3">
            <div className="text-xs text-blue-400 mb-2">Variables</div>
            <div className="space-y-1">
              {Object.entries(step.variables).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-gray-400 font-mono">{key}</span>
                  <span className="text-green-400 font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
// Complexity Panel Component
const ComplexityPanel = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <TrendingUp className="w-12 h-12 mb-4 opacity-50" />
        <p>Click "Complexity" to analyze your code</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 overflow-y-auto">
      <h3 className="text-lg font-semibold text-yellow-400 flex items-center">
        <TrendingUp className="w-5 h-5 mr-2" />
        Complexity Analysis
      </h3>

      {/* Time Complexity */}
      <div className="glass rounded-lg p-4">
        <div className="text-sm text-gray-400 mb-2">Time Complexity</div>
        <div className="text-2xl font-bold text-yellow-400 mb-1">
          {data.timeComplexity.notation}
        </div>
        <div className="text-sm text-gray-300">{data.timeComplexity.description}</div>
        <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs bg-yellow-500/10 text-yellow-400">
          {data.timeComplexity.category} • {Math.round(data.timeComplexity.confidence * 100)}% confidence
        </div>
      </div>

      {/* Space Complexity */}
      <div className="glass rounded-lg p-4">
        <div className="text-sm text-gray-400 mb-2">Space Complexity</div>
        <div className="text-2xl font-bold text-blue-400 mb-1">
          {data.spaceComplexity.notation}
        </div>
        <div className="text-sm text-gray-300">{data.spaceComplexity.description}</div>
        <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs bg-blue-500/10 text-blue-400">
          {data.spaceComplexity.category}
        </div>
      </div>

      {/* Patterns Detected */}
      {data.patterns && data.patterns.length > 0 && (
        <div className="glass rounded-lg p-4">
          <div className="text-sm text-purple-400 mb-3 font-semibold">Algorithmic Patterns</div>
          <div className="space-y-2">
            {data.patterns.map((pattern, idx) => (
              <div key={idx} className="flex items-start space-x-2 p-2 bg-purple-500/10 rounded-lg">
                <CheckCircle className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-white">{pattern.name}</div>
                  <div className="text-xs text-gray-400">{pattern.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loop Analysis */}
      {data.loopAnalysis && data.loopAnalysis.count > 0 && (
        <div className="glass rounded-lg p-4">
          <div className="text-sm text-orange-400 mb-2 font-semibold">Loop Analysis</div>
          <div className="text-sm text-gray-300">
            {data.loopAnalysis.count} loop{data.loopAnalysis.count > 1 ? 's' : ''} detected
            {data.loopAnalysis.nestedLevel > 1 && (
              <span className="ml-2 text-orange-400">
                (Max nesting: {data.loopAnalysis.nestedLevel})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Data Structures */}
      {data.dataStructures && data.dataStructures.length > 0 && (
        <div className="glass rounded-lg p-4">
          <div className="text-sm text-green-400 mb-2 font-semibold">Data Structures</div>
          <div className="flex flex-wrap gap-2">
            {data.dataStructures.map((ds, idx) => (
              <span key={idx} className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs">
                {ds}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="glass rounded-lg p-4">
          <div className="text-sm text-blue-400 mb-3 font-semibold">Recommendations</div>
          <div className="space-y-2">
            {data.recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start space-x-2 p-2 bg-blue-500/5 rounded-lg border border-blue-500/20">
                <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  rec.priority === 'high' ? 'text-red-400' : rec.priority === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                }`} />
                <div className="text-xs text-gray-300">{rec.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Explanation Panel Component
const ExplanationPanel = ({ data, loading, onModeChange }) => {
  const [mode, setMode] = useState('beginner');

  const handleModeChange = (newMode) => {
    setMode(newMode);
    onModeChange(newMode);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Generating AI explanation...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <Brain className="w-12 h-12 mb-4 opacity-50" />
        <p className="mb-4">Click "AI Explain" to get intelligent code explanation</p>
        <div className="flex space-x-2">
          {['beginner', 'interview', 'competitive'].map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className="px-3 py-1 rounded-lg glass hover:glass-strong text-xs"
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-blue-400 flex items-center">
          <Brain className="w-5 h-5 mr-2" />
          AI Explanation
        </h3>
        <div className="flex space-x-2">
          {['beginner', 'interview', 'competitive'].map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                data.mode === m
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                  : 'glass hover:glass-strong text-gray-400'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {data.cached && (
        <div className="text-xs text-gray-400 flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Cached response • Provider: {data.provider}
        </div>
      )}

      {/* Summary */}
      {data.summary && (
        <div className="glass rounded-lg p-4">
          <div className="text-sm text-blue-400 mb-2 font-semibold">Summary</div>
          <div className="text-sm text-white">{data.summary}</div>
        </div>
      )}

      {/* Explanation */}
      {data.explanation && (
        <div className="glass rounded-lg p-4">
          <div className="text-sm text-green-400 mb-2 font-semibold">Detailed Explanation</div>
          <div className="text-sm text-gray-300 whitespace-pre-wrap">{data.explanation}</div>
        </div>
      )}

      {/* Mode-specific content */}
      {data.mode === 'beginner' && (
        <>
          {data.stepByStep && data.stepByStep.length > 0 && (
            <div className="glass rounded-lg p-4">
              <div className="text-sm text-purple-400 mb-3 font-semibold">Step-by-Step Breakdown</div>
              <ol className="space-y-2 list-decimal list-inside">
                {data.stepByStep.map((step, idx) => (
                  <li key={idx} className="text-sm text-gray-300">{step}</li>
                ))}
              </ol>
            </div>
          )}
          {data.keyConcepts && data.keyConcepts.length > 0 && (
            <div className="glass rounded-lg p-4">
              <div className="text-sm text-yellow-400 mb-2 font-semibold">Key Concepts</div>
              <div className="flex flex-wrap gap-2">
                {data.keyConcepts.map((concept, idx) => (
                  <span key={idx} className="px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-xs">
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {data.mode === 'interview' && (
        <>
          {data.approach && (
            <div className="glass rounded-lg p-4">
              <div className="text-sm text-orange-400 mb-2 font-semibold">Approach</div>
              <div className="text-sm text-gray-300">{data.approach}</div>
            </div>
          )}
          {data.edgeCases && data.edgeCases.length > 0 && (
            <div className="glass rounded-lg p-4">
              <div className="text-sm text-red-400 mb-2 font-semibold">Edge Cases</div>
              <ul className="space-y-1 list-disc list-inside">
                {data.edgeCases.map((edge, idx) => (
                  <li key={idx} className="text-sm text-gray-300">{edge}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {data.mode === 'competitive' && (
        <>
          {data.optimizations && data.optimizations.length > 0 && (
            <div className="glass rounded-lg p-4">
              <div className="text-sm text-green-400 mb-2 font-semibold">Optimizations</div>
              <ul className="space-y-1 list-disc list-inside">
                {data.optimizations.map((opt, idx) => (
                  <li key={idx} className="text-sm text-gray-300">{opt}</li>
                ))}
              </ul>
            </div>
          )}
          {data.mistakes && data.mistakes.length > 0 && (
            <div className="glass rounded-lg p-4">
              <div className="text-sm text-red-400 mb-2 font-semibold">Common Mistakes</div>
              <ul className="space-y-1 list-disc list-inside">
                {data.mistakes.map((mistake, idx) => (
                  <li key={idx} className="text-sm text-gray-300">{mistake}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Complexity */}
      {data.complexity && (
        <div className="glass rounded-lg p-4">
          <div className="text-sm text-yellow-400 mb-2 font-semibold">Complexity</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Time:</span>
              <span className="text-white font-mono">{data.complexity.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Space:</span>
              <span className="text-white font-mono">{data.complexity.space}</span>
            </div>
          </div>
        </div>
      )}

      {data.fallback && (
        <div className="glass rounded-lg p-3 border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-yellow-400 mb-1">Fallback Mode</div>
              <div className="text-xs text-gray-400">{data.reason}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CodePlayground;
