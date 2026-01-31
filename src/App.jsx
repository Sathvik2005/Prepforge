import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AnimatePresence } from 'framer-motion';

// Layout
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// UI Components
import CinematicBackground from './components/ui/CinematicBackground';
import Fireflies from './components/ui/Fireflies';
import { ScrollProgress, SpotlightCursor } from './components/ui/GSAPAnimations';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Roadmap from './pages/Roadmap';
import Practice from './pages/Practice';
import MockInterview from './pages/MockInterview';
import CodePlayground from './pages/CodePlayground';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import FocusMode from './pages/FocusMode';
import InterviewScheduling from './pages/InterviewScheduling';
import VideoInterview from './pages/VideoInterview';
import AsyncInterview from './pages/AsyncInterview';
import ResearchDashboard from './pages/ResearchDashboard';
import DSASheets from './pages/DSASheets';

// Protected Route
import ProtectedRoute from './components/auth/ProtectedRoute';

// Theme Store
import { useThemeStore } from './store/themeStore';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Animated Routes Component
function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/roadmap" element={
          <ProtectedRoute>
            <Roadmap />
          </ProtectedRoute>
        } />
        <Route path="/practice" element={
          <ProtectedRoute>
            <Practice />
          </ProtectedRoute>
        } />
        <Route path="/mock-interview" element={
          <ProtectedRoute>
            <MockInterview />
          </ProtectedRoute>
        } />
        <Route path="/code-playground" element={
          <ProtectedRoute>
            <CodePlayground />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/focus-mode" element={
          <ProtectedRoute>
            <FocusMode />
          </ProtectedRoute>
        } />
        <Route path="/schedule-interview" element={
          <ProtectedRoute>
            <InterviewScheduling />
          </ProtectedRoute>
        } />
        <Route path="/video-interview/:sessionId" element={
          <ProtectedRoute>
            <VideoInterview />
          </ProtectedRoute>
        } />
        <Route path="/async-interview/:interviewId" element={
          <ProtectedRoute>
            <AsyncInterview />
          </ProtectedRoute>
        } />
        <Route path="/research" element={
          <ProtectedRoute>
            <ResearchDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dsa-sheets" element={
          <ProtectedRoute>
            <DSASheets />
          </ProtectedRoute>
        } />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const { initTheme } = useThemeStore();

  useEffect(() => {
    // Initialize theme
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    // Initialize smooth scroll behavior
    const initSmoothScroll = async () => {
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
    };

    initSmoothScroll();
  }, []);

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-surface-50 transition-colors duration-500">
        {/* Scroll Progress Indicator */}
        <ScrollProgress />
        
        {/* Spotlight Cursor Effect */}
        <SpotlightCursor />
        
        {/* Cinematic Background */}
        <CinematicBackground />
        
        {/* Fireflies Animation */}
        <Fireflies count={25} />
        
        {/* Toast Notifications - Styled for theme */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)',
            },
            success: {
              iconTheme: {
                primary: '#16a34a',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#dc2626',
                secondary: '#ffffff',
              },
            },
          }}
        />
        
        <Navbar />
        <main className="flex-grow relative z-10">
          <AnimatedRoutes />
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
