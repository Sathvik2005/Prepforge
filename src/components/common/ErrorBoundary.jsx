/**
 * Error Boundary Component
 * Catches React errors and displays fallback UI
 */

import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ Error caught by boundary:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log to error tracking service (e.g., Sentry)
    if (window.SENTRY_ENABLED) {
      // Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Too many errors - prevent infinite loop
      if (this.state.errorCount > 5) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Critical Error
              </h1>
              <p className="text-gray-600 mb-6">
                Multiple errors detected. Please refresh the page or contact support.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-red-600" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-center text-gray-900 mb-3">
                Oops! Something went wrong
              </h1>
              
              {/* Description */}
              <p className="text-center text-gray-600 mb-8">
                We're sorry for the inconvenience. An unexpected error occurred.
              </p>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-red-900 mb-2">Error Details:</h3>
                  <pre className="text-xs text-red-700 overflow-auto max-h-40">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <details className="mt-3">
                      <summary className="text-xs font-medium text-red-900 cursor-pointer">
                        Component Stack
                      </summary>
                      <pre className="text-xs text-red-700 overflow-auto max-h-40 mt-2">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Again
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  <Home className="w-5 h-5" />
                  Go Home
                </button>
              </div>

              {/* Support Info */}
              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-500">
                  If this problem persists, please{' '}
                  <a href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">
                    contact support
                  </a>
                  {' '}or try refreshing the page.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
