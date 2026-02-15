import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Tracking Context
import { TrackingProvider } from './contexts/TrackingContext';

// Auth Context
import { AuthProvider } from './contexts/AuthContext';

// Layout Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Error Boundary
import ErrorBoundary from './components/common/ErrorBoundary';

// Protected Route
import ProtectedRoute from './components/auth/ProtectedRoute';

// UI Components
import CinematicBackground from './components/ui/CinematicBackground';
import Fireflies from './components/ui/Fireflies';
import { ScrollProgress, SpotlightCursor } from './components/ui/GSAPAnimations';

// Lazy load helper with retry logic
const lazyRetry = (componentImport, retries = 3, interval = 1000) => {
  return new Promise((resolve, reject) => {
    componentImport()
      .then(resolve)
      .catch((error) => {
        // If we've exhausted retries, reject
        if (retries === 0) {
          console.error('Failed to load component after retries:', error);
          reject(error);
          return;
        }

        console.warn(`Component load failed, retrying... (${retries} attempts left)`);
        
        // Retry after interval
        setTimeout(() => {
          lazyRetry(componentImport, retries - 1, interval)
            .then(resolve)
            .catch(reject);
        }, interval);
      });
  });
};

// Pages (using React.lazy with retry logic)
const Landing = React.lazy(() => lazyRetry(() => import('./pages/Landing')));
const Login = React.lazy(() => lazyRetry(() => import('./pages/Login')));
const Register = React.lazy(() => lazyRetry(() => import('./pages/Register')));
const Dashboard = React.lazy(() => lazyRetry(() => import('./pages/Dashboard')));
const Roadmap = React.lazy(() => lazyRetry(() => import('./pages/Roadmap')));
const Practice = React.lazy(() => lazyRetry(() => import('./pages/Practice')));
const MockInterview = React.lazy(() => lazyRetry(() => import('./pages/MockInterview')));
const CodePlayground = React.lazy(() => lazyRetry(() => import('./pages/CodePlayground')));
const Analytics = React.lazy(() => lazyRetry(() => import('./pages/Analytics')));
const Profile = React.lazy(() => lazyRetry(() => import('./pages/Profile')));
const FocusMode = React.lazy(() => lazyRetry(() => import('./pages/FocusMode')));
const DSASheets = React.lazy(() => lazyRetry(() => import('./pages/DSASheets')));
const SheetDetail = React.lazy(() => lazyRetry(() => import('./pages/SheetDetail')));
const ResumeToolkit = React.lazy(() => lazyRetry(() => import('./pages/ResumeToolkit')));
const InterviewScheduling = React.lazy(() => lazyRetry(() => import('./pages/InterviewScheduling')));
const VideoInterview = React.lazy(() => lazyRetry(() => import('./pages/VideoInterview')));
const AsyncInterview = React.lazy(() => lazyRetry(() => import('./pages/AsyncInterview')));
const ResearchDashboard = React.lazy(() => lazyRetry(() => import('./pages/ResearchDashboard')));

// Theme Store
import { useThemeStore } from './store/themeStore';

// Auth Store
import { useAuthStore } from './store/authStore';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center pt-20 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500 mx-auto mb-6"></div>
      <p className="text-white text-2xl font-bold mb-2">Loading PrepWiser...</p>
      <p className="text-gray-300 text-base">Please wait while we prepare your content</p>
    </div>
  </div>
);

// Lazy Loading Error Fallback
const LazyLoadError = ({ error, resetErrorBoundary }) => (
  <div className="min-h-screen flex items-center justify-center pt-20 bg-gradient-to-br from-gray-900 via-red-900 to-purple-900">
    <div className="text-center max-w-md mx-auto p-8">
      <div className="text-red-400 mb-6">
        <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-white text-2xl font-bold mb-4">Failed to Load Page</h2>
      <p className="text-gray-300 mb-6">
        {error?.message || 'There was a problem loading this page. Please try again.'}
      </p>
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Reload Page
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  </div>
);

function App() {
  const { initTheme } = useThemeStore();
  const { user } = useAuthStore();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Initialize theme
    try {
      initTheme();
      setTimeout(() => setAppReady(true), 100);
    } catch (error) {
      console.error('Theme initialization error:', error);
      setAppReady(true);
    }
  }, [initTheme]);

  useEffect(() => {
    // Initialize smooth scroll behavior
    const initSmoothScroll = async () => {
      try {
        const Lenis = (await import('lenis')).default;
        const lenis = new Lenis({
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
        });

        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);
      } catch (error) {
        console.error('Smooth scroll initialization failed:', error);
      }
    };

    initSmoothScroll();
  }, []);

  if (!appReady) {
    return <LoadingSpinner />;
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <TrackingProvider userId={user?.uid}>
          <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-surface-50 transition-colors duration-500">
            {/* Scroll Progress Indicator */}
            <ScrollProgress />
            
            {/* Spotlight Cursor Effect */}
            <SpotlightCursor />
            
            {/* Cinematic Background */}
            <CinematicBackground />
            
            {/* Fireflies Animation */}
            <Fireflies count={25} />
            
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  padding: '16px',
                  fontSize: '14px',
                  maxWidth: '500px',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#16a34a',
                    secondary: '#ffffff',
                  },
                  style: {
                    background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                    color: '#064e3b',
                    border: '1px solid #16a34a',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#dc2626',
                    secondary: '#ffffff',
                  },
                  style: {
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    color: '#7f1d1d',
                    border: '1px solid #dc2626',
                  },
                },
                loading: {
                  iconTheme: {
                    primary: '#3b82f6',
                    secondary: '#ffffff',
                  },
                  style: {
                    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                    color: '#1e3a8a',
                    border: '1px solid #3b82f6',
                  },
                },
              }}
            />
            
            {/* Navbar */}
            <Navbar />
            
            {/* Main Content */}
            <main className="flex-grow relative z-10">
              <ErrorBoundary>
                <React.Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    
                    {/* Protected Routes */}
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/roadmap" element={<ProtectedRoute><Roadmap /></ProtectedRoute>} />
                    <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
                    <Route path="/mock-interview" element={<ProtectedRoute><MockInterview /></ProtectedRoute>} />
                    <Route path="/code-playground" element={<ProtectedRoute><CodePlayground /></ProtectedRoute>} />
                    <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/focus-mode" element={<ProtectedRoute><FocusMode /></ProtectedRoute>} />
                    <Route path="/dsa-sheets" element={<DSASheets />} />
                    <Route path="/dsa-sheets/:sheetId" element={<SheetDetail />} />
                    <Route path="/resume-toolkit" element={<ProtectedRoute><ResumeToolkit /></ProtectedRoute>} />
                    <Route path="/schedule-interview" element={<ProtectedRoute><InterviewScheduling /></ProtectedRoute>} />
                    <Route path="/video-interview/:sessionId" element={<ProtectedRoute><VideoInterview /></ProtectedRoute>} />
                    <Route path="/async-interview/:interviewId" element={<ProtectedRoute><AsyncInterview /></ProtectedRoute>} />
                    <Route path="/research" element={<ProtectedRoute><ResearchDashboard /></ProtectedRoute>} />
                  </Routes>
                </React.Suspense>
              </ErrorBoundary>
            </main>
            
            {/* Footer */}
            <Footer />
          </div>
        </TrackingProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
