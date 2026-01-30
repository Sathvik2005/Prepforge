import React, { useState, useEffect, useRef } from 'react';
import useRealTimeInterview from '../../hooks/useRealTimeInterview';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Real-Time Live Interview Component
 * WebSocket-powered adaptive interview session
 */

function LiveInterviewSession({ userId, resumeId, jobDescriptionId }) {
  const {
    connected,
    sessionId,
    currentQuestion,
    turnNumber,
    evaluation,
    sessionState,
    isEvaluating,
    isCompleted,
    finalEvaluation,
    error,
    startInterview,
    submitAnswer,
    sendTyping,
    requestHint,
    pauseInterview,
    resumeInterview,
  } = useRealTimeInterview(userId, resumeId, jobDescriptionId);
  
  const [answer, setAnswer] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const answerRef = useRef(null);
  
  // Auto-focus on answer input
  useEffect(() => {
    if (currentQuestion && answerRef.current) {
      answerRef.current.focus();
    }
  }, [currentQuestion]);
  
  // Track answer start time
  useEffect(() => {
    if (currentQuestion && !startTime) {
      setStartTime(Date.now());
    }
  }, [currentQuestion, startTime]);
  
  const handleStart = (type = 'technical') => {
    startInterview(type);
  };
  
  const handleSubmitAnswer = () => {
    if (!answer.trim()) return;
    
    const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    submitAnswer(answer, timeSpent);
    setAnswer('');
    setStartTime(null);
    setShowHint(false);
  };
  
  const handleAnswerChange = (e) => {
    const value = e.target.value;
    setAnswer(value);
    
    // Send typing indicator
    if (value.length > 0) {
      sendTyping(true);
    } else {
      sendTyping(false);
    }
  };
  
  const handlePause = () => {
    pauseInterview();
    setIsPaused(true);
  };
  
  const handleResume = () => {
    resumeInterview();
    setIsPaused(false);
  };
  
  const handleRequestHint = () => {
    requestHint();
    setShowHint(true);
  };
  
  // Connection status indicator
  const ConnectionStatus = () => (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
      connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
      }`} />
      <span className="text-sm font-medium">
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
  
  // Initial screen
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🎯 Real-Time Interview
            </h1>
            <p className="text-lg text-gray-600">
              Adaptive, AI-powered interview preparation with instant feedback
            </p>
          </div>
          
          <div className="flex justify-center mb-6">
            <ConnectionStatus />
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              ⚠️ {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <button
              onClick={() => handleStart('technical')}
              disabled={!connected}
              className="px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
              💻 Technical Interview
            </button>
            <button
              onClick={() => handleStart('behavioral')}
              disabled={!connected}
              className="px-6 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
              🗣️ Behavioral Interview
            </button>
            <button
              onClick={() => handleStart('mixed')}
              disabled={!connected}
              className="px-6 py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
              🎯 Mixed Interview
            </button>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">✨ Features:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Real-time evaluation with instant feedback</li>
              <li>• Adaptive difficulty based on your performance</li>
              <li>• Dynamic question generation from your resume & job description</li>
              <li>• Multi-metric scoring with transparent formulas</li>
              <li>• Gap detection and personalized recommendations</li>
            </ul>
          </div>
        </motion.div>
      </div>
    );
  }
  
  // Interview completed screen
  if (isCompleted && finalEvaluation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full"
        >
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Interview Complete!
            </h1>
            <p className="text-lg text-gray-600">
              Great job! Here's your performance summary
            </p>
          </div>
          
          {/* Overall Score */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-4">
              <div>
                <div className="text-4xl font-bold">{finalEvaluation.overallScore}</div>
                <div className="text-sm">/ 100</div>
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {finalEvaluation.readinessLevel === 'highly-confident' && '🌟 Highly Confident'}
              {finalEvaluation.readinessLevel === 'interview-ready' && '✅ Interview Ready'}
              {finalEvaluation.readinessLevel === 'needs-improvement' && '📚 Needs Improvement'}
              {finalEvaluation.readinessLevel === 'not-ready' && '🔄 Keep Practicing'}
            </div>
          </div>
          
          {/* Category Scores */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {Object.entries(finalEvaluation.categoryScores || {}).map(([category, score]) => (
              <div key={category} className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{score}</div>
                <div className="text-xs text-gray-600 capitalize">
                  {category.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            ))}
          </div>
          
          {/* Identified Gaps */}
          {finalEvaluation.identifiedGaps?.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                🎯 Areas for Improvement
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {finalEvaluation.identifiedGaps.map((gap, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border-l-4 ${
                      gap.severity === 'critical' ? 'bg-red-50 border-red-500' :
                      gap.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                      gap.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{gap.skill}</div>
                    <div className="text-sm text-gray-600">
                      {gap.type.replace('-', ' ')} • {gap.severity}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Recommendations */}
          {finalEvaluation.recommendations?.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                💡 Recommendations
              </h3>
              <div className="space-y-3">
                {finalEvaluation.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {rec.priority}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900">{rec.area}</div>
                        <div className="text-sm text-gray-700">{rec.action}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Start New Interview
          </button>
        </motion.div>
      </div>
    );
  }
  
  // Active interview screen
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ConnectionStatus />
            <div className="text-sm text-gray-600">
              Turn <span className="font-semibold text-gray-900">{turnNumber}</span> / 15
            </div>
            {sessionState && (
              <div className="text-sm text-gray-600">
                Difficulty: <span className="font-semibold text-gray-900 capitalize">
                  {sessionState.difficultyLevel}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={isPaused ? handleResume : handlePause}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800"
              >
                ⚠️ {error}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Current Question */}
          {currentQuestion && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg p-8"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">❓</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    {currentQuestion}
                  </h2>
                  <button
                    onClick={handleRequestHint}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    💡 Need a hint?
                  </button>
                </div>
              </div>
              
              {/* Answer Input */}
              <div className="space-y-4">
                <textarea
                  ref={answerRef}
                  value={answer}
                  onChange={handleAnswerChange}
                  onBlur={() => sendTyping(false)}
                  placeholder="Type your answer here... Be detailed and include examples."
                  disabled={isEvaluating}
                  className="w-full min-h-[200px] p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-y disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {answer.length} characters • {answer.split(/\s+/).filter(w => w).length} words
                  </div>
                  
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!answer.trim() || isEvaluating}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 disabled:transform-none"
                  >
                    {isEvaluating ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Evaluating...
                      </span>
                    ) : (
                      'Submit Answer →'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Evaluation Feedback */}
          <AnimatePresence>
            {evaluation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-xl shadow-lg p-8"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  📊 Evaluation Results
                </h3>
                
                {/* Score */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                    <div className="text-2xl font-bold">{evaluation.score}</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {evaluation.score >= 85 ? '🌟 Excellent!' :
                       evaluation.score >= 70 ? '✅ Good Job!' :
                       evaluation.score >= 50 ? '📚 Keep Improving' :
                       '🔄 Needs Work'}
                    </div>
                    <div className="text-sm text-gray-600">Turn {evaluation.turnNumber}</div>
                  </div>
                </div>
                
                {/* Metrics Breakdown */}
                <div className="grid grid-cols-5 gap-3 mb-6">
                  {Object.entries(evaluation.metrics).map(([metric, score]) => (
                    <div key={metric} className="text-center">
                      <div className={`text-lg font-bold ${
                        score >= 80 ? 'text-green-600' :
                        score >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {score}
                      </div>
                      <div className="text-xs text-gray-600 capitalize">
                        {metric.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Feedback */}
                <div className="space-y-4">
                  {evaluation.feedback.strengths?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-green-800 mb-2">✅ Strengths:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {evaluation.feedback.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {evaluation.feedback.weaknesses?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-orange-800 mb-2">⚠️ Areas to Improve:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {evaluation.feedback.weaknesses.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {evaluation.feedback.suggestions?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2">💡 Suggestions:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {evaluation.feedback.suggestions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Session State */}
          {sessionState && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">📈 Session Progress</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {sessionState.topicsCovered?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Topics Covered</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {sessionState.skillsProbed?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Skills Tested</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {sessionState.strongAreas?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Strong Areas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {sessionState.strugglingAreas?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Struggling Areas</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default LiveInterviewSession;
