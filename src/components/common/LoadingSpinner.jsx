/**
 * Loading Spinner Component
 * Reusable loading indicator with customizable size and message
 */

import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ 
  size = 'md', 
  message = 'Loading...', 
  fullScreen = false,
  className = '' 
}) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const spinnerSize = sizes[size] || sizes.md;

  const content = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className="relative">
        <Loader2 className={`${spinnerSize} text-blue-600 animate-spin`} />
        <div className={`absolute inset-0 ${spinnerSize} bg-blue-400 rounded-full opacity-20 animate-ping`}></div>
      </div>
      {message && (
        <p className="text-gray-700 font-medium text-sm animate-pulse">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
}
