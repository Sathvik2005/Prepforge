import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Layout
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

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

// Protected Route
import ProtectedRoute from './components/auth/ProtectedRoute';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

function App() {
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
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
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
            <Route path="/focus" element={
              <ProtectedRoute>
                <FocusMode />
              </ProtectedRoute>
            } />
            <Route path="/schedule-interview" element={
              <ProtectedRoute>
                <InterviewScheduling />
              </ProtectedRoute>
            } />
            <Route path="/interview/video/:interviewId" element={
              <ProtectedRoute>
                <VideoInterview />
              </ProtectedRoute>
            } />
            <Route path="/interview/async/:interviewId" element={
              <ProtectedRoute>
                <AsyncInterview />
              </ProtectedRoute>
            } />
            <Route path="/research" element={
              <ProtectedRoute>
                <ResearchDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
        <Footer />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
