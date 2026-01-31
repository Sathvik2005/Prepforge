/**
 * Integration Test Component
 * Tests Firebase + OpenAI + Backend connectivity
 */

import { useState } from 'react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { aiAPI, authAPI } from '@/services/api';
import { motion } from 'framer-motion';

const IntegrationTest = () => {
  const { 
    signInWithEmail, 
    signInWithGoogle, 
    signUpWithEmail,
    isFirebaseEnabled,
    loading: authLoading 
  } = useFirebaseAuth();

  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  // Test 1: Firebase Authentication
  const testFirebaseAuth = async () => {
    setLoading(true);
    try {
      if (!isFirebaseEnabled) {
        setTestResults(prev => ({
          ...prev,
          firebaseAuth: {
            status: 'warning',
            message: 'Firebase not configured - using JWT fallback'
          }
        }));
        return;
      }

      // This would normally be user input
      const testEmail = 'test@prepforge.com';
      const testPassword = 'Test123456';

      await signUpWithEmail(testEmail, testPassword, 'Test User');
      
      setTestResults(prev => ({
        ...prev,
        firebaseAuth: {
          status: 'success',
          message: '✅ Firebase authentication working!'
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        firebaseAuth: {
          status: 'error',
          message: `❌ Error: ${error.message}`
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  // Test 2: Google Sign-In
  const testGoogleSignIn = async () => {
    setLoading(true);
    try {
      if (!isFirebaseEnabled) {
        setTestResults(prev => ({
          ...prev,
          googleAuth: {
            status: 'warning',
            message: 'Firebase not configured'
          }
        }));
        return;
      }

      await signInWithGoogle();
      
      setTestResults(prev => ({
        ...prev,
        googleAuth: {
          status: 'success',
          message: '✅ Google sign-in working!'
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        googleAuth: {
          status: 'error',
          message: `❌ Error: ${error.message}`
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  // Test 3: OpenAI Question Generation
  const testOpenAIQuestions = async () => {
    setLoading(true);
    try {
      const response = await aiAPI.generateQuestion({
        role: 'Backend',
        difficulty: 'Medium',
        format: 'coding',
        topic: 'Arrays',
        count: 1
      });

      const isOpenAI = response.data.questions[0].aiProvider === 'openai-gpt4';
      
      setTestResults(prev => ({
        ...prev,
        openaiQuestions: {
          status: isOpenAI ? 'success' : 'warning',
          message: isOpenAI 
            ? '✅ OpenAI GPT-4 question generation working!' 
            : '⚠️ Using template fallback (OpenAI not configured)'
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        openaiQuestions: {
          status: 'error',
          message: `❌ Error: ${error.message}`
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  // Test 4: OpenAI Feedback Generation
  const testOpenAIFeedback = async () => {
    setLoading(true);
    try {
      const response = await aiAPI.generateFeedback({
        codeSolution: 'function twoSum(nums, target) { /* solution */ }',
        transcript: 'I think we should use a HashMap here...',
        question: { description: 'Two Sum problem' },
        format: 'coding'
      });

      const isOpenAI = response.data.feedback.explainableAI?.provider === 'openai-gpt4';
      
      setTestResults(prev => ({
        ...prev,
        openaifdback: {
          status: isOpenAI ? 'success' : 'warning',
          message: isOpenAI 
            ? '✅ OpenAI GPT-4 feedback generation working!' 
            : '⚠️ Using template fallback (OpenAI not configured)'
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        openaiFeedback: {
          status: 'error',
          message: `❌ Error: ${error.message}`
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  // Test 5: AI Study Companion
  const testStudyCompanion = async () => {
    setLoading(true);
    try {
      const response = await aiAPI.askCompanion({
        query: 'How do I optimize this solution?',
        context: 'Working on dynamic programming'
      });

      const isOpenAI = response.data.response.aiProvider === 'openai-gpt4';
      
      setTestResults(prev => ({
        ...prev,
        studyCompanion: {
          status: isOpenAI ? 'success' : 'warning',
          message: isOpenAI 
            ? '✅ OpenAI study companion working!' 
            : '⚠️ Using template fallback (OpenAI not configured)'
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        studyCompanion: {
          status: 'error',
          message: `❌ Error: ${error.message}`
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  // Test 6: Backend Connectivity
  const testBackendConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/health');
      const data = await response.json();
      
      setTestResults(prev => ({
        ...prev,
        backendConnection: {
          status: 'success',
          message: `✅ Backend connected! Version: ${data.version}`
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        backendConnection: {
          status: 'error',
          message: `❌ Backend not reachable: ${error.message}`
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    await testBackendConnection();
    await testFirebaseAuth();
    await testOpenAIQuestions();
    await testOpenAIFeedback();
    await testStudyCompanion();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'warning': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'error': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-navy-900 p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            🧪 Integration Test Suite
          </h1>
          <p className="text-white/60 mb-8">
            Test Firebase, OpenAI, and backend connectivity
          </p>

          {/* Firebase Status Badge */}
          <div className="mb-6 flex gap-4">
            <div className={`px-4 py-2 rounded-lg border ${isFirebaseEnabled ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
              {isFirebaseEnabled ? '✅ Firebase Enabled' : '⚠️ Firebase Disabled (JWT Mode)'}
            </div>
          </div>

          {/* Test Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={testBackendConnection}
              disabled={loading}
              className="px-6 py-3 bg-navy-700 hover:bg-navy-800 text-white rounded-lg disabled:opacity-50 transition-all"
            >
              Test Backend
            </button>
            <button
              onClick={testFirebaseAuth}
              disabled={loading || !isFirebaseEnabled}
              className="px-6 py-3 bg-royal-600 hover:bg-royal-700 text-white rounded-lg disabled:opacity-50 transition-all"
            >
              Test Firebase Auth
            </button>
            <button
              onClick={testOpenAIQuestions}
              disabled={loading}
              className="px-6 py-3 bg-success-600 hover:bg-success-700 text-white rounded-lg disabled:opacity-50 transition-all"
            >
              Test OpenAI Questions
            </button>
            <button
              onClick={testOpenAIFeedback}
              disabled={loading}
              className="px-6 py-3 bg-success-700 hover:bg-success-800 text-white rounded-lg disabled:opacity-50 transition-all"
            >
              Test OpenAI Feedback
            </button>
            <button
              onClick={testStudyCompanion}
              disabled={loading}
              className="px-6 py-3 bg-warning-600 hover:bg-warning-700 text-white rounded-lg disabled:opacity-50 transition-all"
            >
              Test Study Companion
            </button>
            <button
              onClick={runAllTests}
              disabled={loading}
              className="px-6 py-3 bg-royal-600 hover:bg-royal-700 text-white rounded-lg disabled:opacity-50 transition-all font-bold"
            >
              🚀 Run All Tests
            </button>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">Test Results</h2>
            {Object.keys(testResults).length === 0 ? (
              <p className="text-white/40 text-center py-8">
                Click a test button to begin...
              </p>
            ) : (
              Object.entries(testResults).map(([key, result]) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-sm">{result.message}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {loading && (
            <div className="mt-4 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-white"></div>
              <p className="text-white/60 mt-2">Testing...</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default IntegrationTest;
