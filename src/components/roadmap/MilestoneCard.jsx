import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MilestoneCard = ({ 
  milestone, 
  isExpanded, 
  onToggle, 
  onComplete, 
  onReschedule, 
  onUpdate,
  isUpdating 
}) => {
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  
  const {
    id,
    title,
    description,
    estimatedHours,
    resources = [],
    prerequisites = [],
    dependencies = [],
    status = 'pending',
    completedAt,
    confidence,
    tasks = [],
    audit = [],
  } = milestone;
  
  const isCompleted = status === 'completed';
  const isPending = status === 'pending';
  const isInProgress = status === 'in-progress';
  
  const handleRescheduleSubmit = () => {
    if (newDate) {
      onReschedule(newDate);
      setShowReschedule(false);
      setNewDate('');
    }
  };
  
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'bg-green-100 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300';
      case 'in-progress': return 'bg-blue-100 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300';
      default: return 'bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300';
    }
  };
  
  const getConfidenceColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  return (
    <motion.div
      layout
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border-l-4 overflow-hidden ${
        isCompleted ? 'border-green-500' :
        isInProgress ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'
      }`}
    >
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
                {status}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {estimatedHours}h
              </span>
              
              {confidence && (
                <span className={`flex items-center gap-1 font-medium ${getConfidenceColor(confidence)}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {confidence}% confidence
                </span>
              )}
              
              {completedAt && (
                <span className="text-green-600 dark:text-green-400">
                  ✓ Completed {new Date(completedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          
          <motion.svg
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-5 h-5 text-gray-500 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </div>
      
      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            <div className="p-4 space-y-4">
              {/* Description */}
              {description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {description}
                  </p>
                </div>
              )}
              
              {/* Tasks */}
              {tasks.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Tasks
                  </h4>
                  <ul className="space-y-1">
                    {tasks.map((task, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-blue-500 mt-1">•</span>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Resources */}
              {resources.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Resources
                  </h4>
                  <div className="space-y-2">
                    {resources.map((resource, idx) => (
                      <a
                        key={idx}
                        href={resource.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 
                                 hover:underline"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {resource.title || resource.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Prerequisites & Dependencies */}
              {(prerequisites.length > 0 || dependencies.length > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  {prerequisites.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Prerequisites
                      </h4>
                      <ul className="space-y-1">
                        {prerequisites.map((prereq, idx) => (
                          <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 
                                                    px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                            {prereq}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {dependencies.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Dependencies
                      </h4>
                      <ul className="space-y-1">
                        {dependencies.map((dep, idx) => (
                          <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 
                                                    px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 rounded">
                            {dep}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {/* Audit Log (LLM Phrasing Indicator) */}
              {audit.length > 0 && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">
                    AI Phrasing Log
                  </h4>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    {audit[audit.length - 1]?.action || 'Text phrased by LLM'}
                  </p>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                {!isCompleted && (
                  <button
                    onClick={onComplete}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 
                             text-white rounded-lg text-sm font-medium transition-colors
                             flex items-center gap-2"
                  >
                    {isUpdating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Mark Complete
                      </>
                    )}
                  </button>
                )}
                
                {!isCompleted && (
                  <button
                    onClick={() => setShowReschedule(!showReschedule)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                             text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors
                             flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Reschedule
                  </button>
                )}
              </div>
              
              {/* Reschedule Form */}
              <AnimatePresence>
                {showReschedule && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-2 border-t border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <button
                        onClick={handleRescheduleSubmit}
                        disabled={!newDate}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                                 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setShowReschedule(false)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                                 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MilestoneCard;
