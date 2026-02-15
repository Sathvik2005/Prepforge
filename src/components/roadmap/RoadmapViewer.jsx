import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MilestoneCard from './MilestoneCard';
import DependencyGraph from './DependencyGraph';

const RoadmapViewer = ({ roadmap, onMilestoneUpdate, onExport, isUpdating }) => {
  const [selectedPhase, setSelectedPhase] = useState(0);
  const [viewMode, setViewMode] = useState('phases'); // 'phases' or 'graph'
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'pending'
  const [expandedMilestones, setExpandedMilestones] = useState(new Set());
  
  if (!roadmap) return null;
  
  const { phases = [], schedule, feasibilityScore, targetRole, targetDate, weeklyHours } = roadmap;
  
  // Calculate overall progress
  const totalMilestones = phases.reduce((sum, phase) => sum + (phase.milestones?.length || 0), 0);
  const completedMilestones = phases.reduce(
    (sum, phase) => sum + (phase.milestones?.filter(m => m.status === 'completed').length || 0),
    0
  );
  const overallProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  
  // Filter milestones based on status
  const filterMilestones = (milestones) => {
    if (filter === 'all') return milestones;
    if (filter === 'completed') return milestones.filter(m => m.status === 'completed');
    if (filter === 'pending') return milestones.filter(m => m.status !== 'completed');
    return milestones;
  };
  
  const toggleMilestone = (milestoneId) => {
    setExpandedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(milestoneId)) {
        next.delete(milestoneId);
      } else {
        next.add(milestoneId);
      }
      return next;
    });
  };
  
  const handleMilestoneAction = async (phaseIdx, milestoneId, action, payload = {}) => {
    await onMilestoneUpdate(roadmap._id, milestoneId, { action, payload });
  };
  
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {targetRole} Roadmap
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Target: {new Date(targetDate).toLocaleDateString()} • {weeklyHours}h/week
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('phases')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'phases'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Phases
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'graph'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Graph
              </button>
            </div>
            
            {/* Export Button */}
            <button
              onClick={onExport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                       text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Progress
            </span>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {completedMilestones} / {totalMilestones} milestones ({Math.round(overallProgress)}%)
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
            />
          </div>
        </div>
        
        {/* Feasibility Score */}
        {feasibilityScore && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Feasibility Score</span>
              <span className={`text-lg font-bold ${
                feasibilityScore >= 70 ? 'text-green-600' :
                feasibilityScore >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {feasibilityScore}%
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Filter Controls */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
        <div className="flex gap-2">
          {['all', 'pending', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content: Phases or Graph */}
      <AnimatePresence mode="wait">
        {viewMode === 'phases' ? (
          <motion.div
            key="phases"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Phase Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="flex overflow-x-auto">
                {phases.map((phase, idx) => {
                  const phaseCompleted = phase.milestones?.filter(m => m.status === 'completed').length || 0;
                  const phaseTotal = phase.milestones?.length || 0;
                  const phaseProgress = phaseTotal > 0 ? (phaseCompleted / phaseTotal) * 100 : 0;
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedPhase(idx)}
                      className={`flex-1 min-w-max px-6 py-4 border-b-2 transition-colors ${
                        selectedPhase === idx
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {phase.name || `Phase ${idx + 1}`}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {phaseCompleted}/{phaseTotal} • {Math.round(phaseProgress)}%
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Phase Content */}
            {phases[selectedPhase] && (
              <motion.div
                key={selectedPhase}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Phase Description */}
                {phases[selectedPhase].description && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <p className="text-gray-700 dark:text-gray-300">
                      {phases[selectedPhase].description}
                    </p>
                  </div>
                )}
                
                {/* Milestones */}
                <div className="space-y-4">
                  {filterMilestones(phases[selectedPhase].milestones || []).map((milestone) => (
                    <MilestoneCard
                      key={milestone.id}
                      milestone={milestone}
                      isExpanded={expandedMilestones.has(milestone.id)}
                      onToggle={() => toggleMilestone(milestone.id)}
                      onComplete={() => handleMilestoneAction(selectedPhase, milestone.id, 'complete')}
                      onReschedule={(newDate) => 
                        handleMilestoneAction(selectedPhase, milestone.id, 'reschedule', { newDate })
                      }
                      onUpdate={(updates) => 
                        handleMilestoneAction(selectedPhase, milestone.id, 'update', updates)
                      }
                      isUpdating={isUpdating}
                    />
                  ))}
                  
                  {filterMilestones(phases[selectedPhase].milestones || []).length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No milestones match the current filter.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="graph"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DependencyGraph 
              phases={phases} 
              onMilestoneClick={(milestone) => {
                // Find phase containing this milestone
                const phaseIdx = phases.findIndex(p => 
                  p.milestones?.some(m => m.id === milestone.id)
                );
                if (phaseIdx >= 0) {
                  setSelectedPhase(phaseIdx);
                  setViewMode('phases');
                  toggleMilestone(milestone.id);
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Daily Schedule Preview (if available) */}
      {schedule?.dailyPlans && schedule.dailyPlans.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Upcoming Schedule
          </h3>
          <div className="space-y-2">
            {schedule.dailyPlans.slice(0, 7).map((plan, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {new Date(plan.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {plan.tasks?.join(', ') || 'No tasks scheduled'}
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {plan.estimatedHours || 0}h
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapViewer;
