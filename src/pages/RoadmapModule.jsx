import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RoadmapGenerator from '../components/roadmap/RoadmapGenerator';
import RoadmapViewer from '../components/roadmap/RoadmapViewer';
import ProvenancePanel from '../components/roadmap/ProvenancePanel';
import {
  generateRoadmap,
  getRoadmap,
  updateMilestone,
  exportRoadmap,
  getUserRoadmaps,
  initSocketConnection,
  subscribeToRoadmapEvents,
  disconnectSocket,
} from '../services/roadmapApi';

const RoadmapModulePage = () => {
  // Mock userId - replace with actual auth context
  const userId = 'user-123';
  
  const [roadmaps, setRoadmaps] = useState([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [showProvenance, setShowProvenance] = useState(false);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  
  // Initialize Socket.IO connection
  useEffect(() => {
    const socket = initSocketConnection(userId);
    
    const cleanup = subscribeToRoadmapEvents(selectedRoadmap?._id, {
      onUpdate: (diff) => {
        console.log('[Roadmap] Remote update received:', diff);
        // Apply optimistic update
        if (selectedRoadmap) {
          loadRoadmapDetails(selectedRoadmap._id);
        }
      },
      onProgress: (milestonesUpdated) => {
        console.log('[Roadmap] Progress update:', milestonesUpdated);
        // Refresh roadmap
        if (selectedRoadmap) {
          loadRoadmapDetails(selectedRoadmap._id);
        }
      },
    });
    
    return () => {
      cleanup();
      disconnectSocket();
    };
  }, [selectedRoadmap?._id, userId]);
  
  // Load user's roadmaps on mount
  useEffect(() => {
    loadUserRoadmaps();
  }, [userId]);
  
  const loadUserRoadmaps = async () => {
    try {
      const data = await getUserRoadmaps(userId);
      setRoadmaps(data);
      
      // Load from localStorage if available
      const savedRoadmapId = localStorage.getItem('last_roadmap_id');
      if (savedRoadmapId) {
        const savedRoadmap = data.find(r => r._id === savedRoadmapId);
        if (savedRoadmap) {
          handleSelectRoadmap(savedRoadmap._id);
        }
      }
    } catch (err) {
      console.error('Failed to load roadmaps:', err);
      setError(err.message);
    }
  };
  
  const loadRoadmapDetails = async (roadmapId) => {
    try {
      const data = await getRoadmap(roadmapId);
      setSelectedRoadmap(data);
      localStorage.setItem('last_roadmap_id', roadmapId);
    } catch (err) {
      console.error('Failed to load roadmap details:', err);
      setError(err.message);
    }
  };
  
  const handleGenerate = async (payload) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const result = await generateRoadmap(payload);
      
      // Fetch full roadmap details
      await loadRoadmapDetails(result.roadmapId);
      
      // Refresh roadmaps list
      await loadUserRoadmaps();
      
      // Show success message
      console.log('Roadmap generated successfully:', result);
    } catch (err) {
      console.error('Failed to generate roadmap:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSelectRoadmap = async (roadmapId) => {
    await loadRoadmapDetails(roadmapId);
  };
  
  const handleMilestoneUpdate = async (roadmapId, milestoneId, update) => {
    setIsUpdating(true);
    
    // Optimistic update
    if (selectedRoadmap) {
      const updatedRoadmap = { ...selectedRoadmap };
      updatedRoadmap.phases = updatedRoadmap.phases.map(phase => ({
        ...phase,
        milestones: phase.milestones.map(m => 
          m.id === milestoneId 
            ? { ...m, status: update.action === 'complete' ? 'completed' : m.status }
            : m
        ),
      }));
      setSelectedRoadmap(updatedRoadmap);
    }
    
    try {
      const result = await updateMilestone(roadmapId, milestoneId, update);
      setSelectedRoadmap(result);
    } catch (err) {
      console.error('Failed to update milestone:', err);
      setError(err.message);
      
      // Revert optimistic update
      await loadRoadmapDetails(roadmapId);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleExport = async () => {
    if (!selectedRoadmap) return;
    
    try {
      const blob = await exportRoadmap(selectedRoadmap._id);
      
      // Download PDF
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `roadmap-${selectedRoadmap.targetRole}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export roadmap:', err);
      setError(err.message);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            AI Roadmap Generator
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Generate personalized, auditable study roadmaps with deterministic planning
          </p>
        </div>
        
        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
                       rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar: Roadmap List & Generator */}
          <div className="lg:col-span-1 space-y-6">
            {/* Generator Form */}
            <RoadmapGenerator
              userId={userId}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
            
            {/* Existing Roadmaps */}
            {roadmaps.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Your Roadmaps
                </h3>
                <div className="space-y-2">
                  {roadmaps.map((roadmap) => (
                    <button
                      key={roadmap._id}
                      onClick={() => handleSelectRoadmap(roadmap._id)}
                      className={`w-full p-3 text-left rounded-lg transition-colors ${
                        selectedRoadmap?._id === roadmap._id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {roadmap.targetRole}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Target: {new Date(roadmap.targetDate).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Main Content: Roadmap Viewer */}
          <div className="lg:col-span-2 space-y-6">
            {selectedRoadmap ? (
              <>
                {/* View/Provenance Toggle */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowProvenance(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !showProvenance
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Roadmap
                  </button>
                  <button
                    onClick={() => setShowProvenance(true)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showProvenance
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Provenance
                  </button>
                </div>
                
                <AnimatePresence mode="wait">
                  {!showProvenance ? (
                    <motion.div
                      key="viewer"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <RoadmapViewer
                        roadmap={selectedRoadmap}
                        onMilestoneUpdate={handleMilestoneUpdate}
                        onExport={handleExport}
                        isUpdating={isUpdating}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="provenance"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <ProvenancePanel
                        roadmapId={selectedRoadmap._id}
                        userId={userId}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
                <svg 
                  className="w-16 h-16 mx-auto mb-4 text-gray-400"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" 
                  />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Roadmap Selected
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Generate a new roadmap or select an existing one from the sidebar
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadmapModulePage;
