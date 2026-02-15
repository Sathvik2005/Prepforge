import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const DependencyGraph = ({ phases, onMilestoneClick }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const container = containerRef.current;
    
    // Set canvas size
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Extract all milestones with positions
    const nodes = [];
    const edges = [];
    
    phases.forEach((phase, phaseIdx) => {
      (phase.milestones || []).forEach((milestone, mIdx) => {
        nodes.push({
          id: milestone.id,
          title: milestone.title,
          status: milestone.status,
          x: ((phaseIdx + 1) / (phases.length + 1)) * canvas.width,
          y: ((mIdx + 1) / (phase.milestones.length + 1)) * canvas.height,
          dependencies: milestone.dependencies || [],
        });
      });
    });
    
    // Build edges from dependencies
    nodes.forEach(node => {
      node.dependencies.forEach(depId => {
        const depNode = nodes.find(n => n.id === depId);
        if (depNode) {
          edges.push({ from: depNode, to: node });
        }
      });
    });
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw edges
    edges.forEach(edge => {
      ctx.beginPath();
      ctx.moveTo(edge.from.x, edge.from.y);
      ctx.lineTo(edge.to.x, edge.to.y);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw arrow head
      const angle = Math.atan2(edge.to.y - edge.from.y, edge.to.x - edge.from.x);
      const headLength = 10;
      ctx.beginPath();
      ctx.moveTo(edge.to.x, edge.to.y);
      ctx.lineTo(
        edge.to.x - headLength * Math.cos(angle - Math.PI / 6),
        edge.to.y - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        edge.to.x - headLength * Math.cos(angle + Math.PI / 6),
        edge.to.y - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = '#94a3b8';
      ctx.fill();
    });
    
    // Draw nodes
    nodes.forEach(node => {
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI);
      
      if (node.status === 'completed') {
        ctx.fillStyle = '#10b981';
      } else if (node.status === 'in-progress') {
        ctx.fillStyle = '#3b82f6';
      } else {
        ctx.fillStyle = '#6b7280';
      }
      ctx.fill();
      
      // Node border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Draw checkmark for completed
      if (node.status === 'completed') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(node.x - 6, node.y);
        ctx.lineTo(node.x - 2, node.y + 6);
        ctx.lineTo(node.x + 8, node.y - 6);
        ctx.stroke();
      }
    });
    
    // Add click handler
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const clickedNode = nodes.find(node => {
        const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
        return distance <= 20;
      });
      
      if (clickedNode && onMilestoneClick) {
        onMilestoneClick(clickedNode);
      }
    };
    
    canvas.addEventListener('click', handleClick);
    
    return () => {
      canvas.removeEventListener('click', handleClick);
    };
  }, [phases, onMilestoneClick]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Dependency Graph
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span className="text-gray-600 dark:text-gray-400">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Pending</span>
          </div>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="relative w-full bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-hidden"
        style={{ height: '600px' }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
        />
        
        {/* Tooltip (could be enhanced with state management) */}
        <div className="absolute bottom-4 left-4 text-xs text-gray-500 dark:text-gray-400">
          Click on nodes to view milestone details
        </div>
      </div>
    </motion.div>
  );
};

export default DependencyGraph;
