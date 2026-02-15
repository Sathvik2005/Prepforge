import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import RoadmapModule from './pages/RoadmapModule';

/**
 * DEMO PAGE - Minimal Roadmap Module Integration
 * 
 * This is a standalone demo that shows the complete Roadmap Module
 * working independently. Use this to test the module before integrating
 * into your main application.
 * 
 * To run:
 * 1. Ensure backend is running at http://localhost:5000
 * 2. Start Vite dev server: npm run dev
 * 3. Navigate to http://localhost:3000/demo
 */

function RoadmapDemo() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
        {/* Demo Header */}
        <div className="bg-blue-600 text-white py-4 px-6 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold">🚀 Roadmap Module Demo</h1>
            <p className="text-blue-100 text-sm mt-1">
              Standalone demonstration of the AI Roadmap Generator
            </p>
          </div>
        </div>
        
        {/* Demo Info Banner */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 
                        rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  Demo Mode Active
                </h3>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
                  This demo uses a mock userId: <code className="font-mono bg-yellow-100 dark:bg-yellow-900/50 
                  px-1 rounded">user-123</code>
                </p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>✓ Backend must be running at: <code className="font-mono">http://localhost:5000</code></li>
                  <li>✓ Socket.IO connection enabled for real-time sync</li>
                  <li>✓ LocalStorage persistence for offline drafts</li>
                  <li>✓ Full provenance tracking and audit logs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Roadmap Module */}
        <RoadmapModule />
        
        {/* Demo Footer */}
        <div className="max-w-7xl mx-auto px-4 py-8 mt-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Integration Instructions
            </h3>
            
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <div>
                <h4 className="font-semibold mb-2">Step 1: Add Route</h4>
                <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto">
{`import RoadmapModule from './pages/RoadmapModule';

<Route path="/roadmap" element={<RoadmapModule />} />`}
                </pre>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Step 2: Configure Auth</h4>
                <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto">
{`const { user } = useAuth();
const userId = user?.id || 'guest';`}
                </pre>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Step 3: Set Environment Variable</h4>
                <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto">
{`VITE_BACKEND_BASE_URL=http://localhost:5000`}
                </pre>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Sample Generation Request</h4>
                <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto">
{`{
  "userId": "user-123",
  "role": "Data Scientist",
  "jdText": "Looking for experience in Python, ML, SQL",
  "targetDate": "2026-08-01",
  "weeklyHours": 10,
  "experience": "novice",
  "focusAreas": ["ML", "NLP"]
}`}
                </pre>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                📚 Documentation
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Full integration guide available in <code className="font-mono">ROADMAP_MODULE_README.md</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default RoadmapDemo;
