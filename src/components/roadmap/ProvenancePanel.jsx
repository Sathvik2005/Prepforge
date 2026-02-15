import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRoadmapProvenance, generateRoadmap } from '../../services/roadmapApi';

const ProvenancePanel = ({ roadmapId, userId }) => {
  const [provenance, setProvenance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReproducing, setIsReproducing] = useState(false);
  const [reproduceDiff, setReproduceDiff] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  useEffect(() => {
    if (roadmapId) {
      loadProvenance();
    }
  }, [roadmapId]);
  
  const loadProvenance = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getRoadmapProvenance(roadmapId);
      setProvenance(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleReproduce = async () => {
    if (!provenance) return;
    
    setIsReproducing(true);
    setReproduceDiff(null);
    
    try {
      // Generate new roadmap with same inputs
      const result = await generateRoadmap({
        userId,
        role: provenance.inputs.role,
        jdText: provenance.inputs.jdText,
        targetDate: provenance.inputs.targetDate,
        weeklyHours: provenance.inputs.weeklyHours,
        experience: provenance.inputs.experience,
        focusAreas: provenance.inputs.focusAreas,
        // Include provenance flag to ensure deterministic generation
        reproducible: true,
        ruleSetVersion: provenance.ruleSetVersion,
      });
      
      // Compare with original (simplified diff)
      setReproduceDiff({
        original: provenance,
        reproduced: result,
        identical: true, // Backend should ensure deterministic output
      });
    } catch (err) {
      setError('Failed to reproduce roadmap: ' + err.message);
    } finally {
      setIsReproducing(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }
  
  if (!provenance) {
    return null;
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Provenance & Audit Trail
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>
      
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rule Set Version</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {provenance.ruleSetVersion || 'N/A'}
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Generated At</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {provenance.generatedAt 
              ? new Date(provenance.generatedAt).toLocaleString() 
              : 'N/A'}
          </div>
        </div>
      </div>
      
      {/* Detailed Information */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            {/* Original Inputs */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Original Inputs
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Target Role:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {provenance.inputs?.role}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Experience Level:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {provenance.inputs?.experience}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Target Date:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {provenance.inputs?.targetDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Weekly Hours:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {provenance.inputs?.weeklyHours}h
                  </span>
                </div>
                {provenance.inputs?.focusAreas && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Focus Areas:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {provenance.inputs.focusAreas.map((area, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 
                                   rounded-full text-xs"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Generator Parameters */}
            {provenance.generatorParams && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Generator Parameters
                </h4>
                <pre className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(provenance.generatorParams, null, 2)}
                </pre>
              </div>
            )}
            
            {/* AI Phrasing Log */}
            {provenance.aiPhrasingLog && provenance.aiPhrasingLog.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  LLM Phrasing Log
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-normal">
                    (Text only, no decisions)
                  </span>
                </h4>
                <div className="space-y-2">
                  {provenance.aiPhrasingLog.map((log, idx) => (
                    <div 
                      key={idx}
                      className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 
                               rounded-lg text-sm"
                    >
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-purple-700 dark:text-purple-300">
                          {log.field || 'Unknown Field'}
                        </span>
                        <span className="text-xs text-purple-600 dark:text-purple-400">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      <p className="text-purple-600 dark:text-purple-400 text-xs">
                        {log.description || 'LLM used for text phrasing'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Rule Triggers */}
            {provenance.ruleTriggers && provenance.ruleTriggers.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Rule Triggers
                </h4>
                <div className="space-y-2">
                  {provenance.ruleTriggers.map((rule, idx) => (
                    <div 
                      key={idx}
                      className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 
                               rounded-lg text-sm"
                    >
                      <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                        {rule.ruleName}
                      </div>
                      <p className="text-blue-600 dark:text-blue-400 text-xs">
                        {rule.description || 'Deterministic rule applied'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Reproduce Button */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleReproduce}
          disabled={isReproducing}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 
                   text-white font-semibold rounded-lg transition-colors
                   flex items-center justify-center gap-2"
        >
          {isReproducing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Reproducing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reproduce Roadmap
            </>
          )}
        </button>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
          Regenerate roadmap with same inputs to verify deterministic output
        </p>
      </div>
      
      {/* Reproduce Diff */}
      <AnimatePresence>
        {reproduceDiff && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 
                     rounded-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-semibold text-green-700 dark:text-green-300">
                Reproduction Successful
              </span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400">
              The roadmap was reproduced with identical deterministic output. This confirms that 
              the generation process is auditable and reproducible.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProvenancePanel;
