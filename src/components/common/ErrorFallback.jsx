/**
 * Error Fallback Component
 * Used when lazy-loaded components fail to load
 */

import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ErrorFallback({ componentName = 'Component' }) {
  const navigate = useNavigate();

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 pt-20">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-3">
            Failed to Load {componentName}
          </h2>
          
          {/* Description */}
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            The component couldn't be loaded. This might be due to a network issue or missing file.
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleReload}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Reload Page
            </button>
            
            <button
              onClick={handleGoHome}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              <Home className="w-5 h-5" />
              Go to Home
            </button>
          </div>

          {/* Dev Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs text-yellow-800 dark:text-yellow-200 font-mono">
                Check browser console for details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
