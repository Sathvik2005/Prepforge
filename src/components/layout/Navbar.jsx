import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Zap, User, LogOut, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import ThemeToggle from '../ui/ThemeToggle';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { initTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Initialize theme on mount
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = user
    ? [
        { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
        { name: 'Roadmap', path: '/roadmap', icon: Zap },
        { name: 'DSA Sheets', path: '/dsa-sheets', icon: Zap },
        { name: 'Practice', path: '/practice', icon: Zap },
        { name: 'Mock Interview', path: '/mock-interview', icon: Zap },
        { name: 'Schedule Interview', path: '/schedule-interview', icon: Zap },
        { name: 'Resume Toolkit', path: '/resume-toolkit', icon: Zap },
        { name: 'Code Playground', path: '/code-playground', icon: Zap },
      ]
    : [
        { name: 'Features', path: '#features' },
        { name: 'How It Works', path: '#how-it-works' },
        { name: 'Testimonials', path: '#testimonials' },
      ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'glass-strong shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ duration: 0.6 }}
              className="w-10 h-10 bg-royal-600 rounded-lg flex items-center justify-center shadow-soft-md"
            >
              <Zap className="w-6 h-6 text-white" />
            </motion.div>
            <span className="text-2xl font-bold text-navy-900 dark:text-white">
              PrepForge
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-all duration-300 hover:text-royal-500 ${
                  location.pathname === link.path
                    ? 'text-royal-600'
                    : 'text-surface-600 dark:text-surface-300'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* User Menu / Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle variant="simple" />
            
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg glass hover:glass-strong transition-all duration-300"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm">{user.name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-error-500/10 hover:bg-error-500/20 text-error-600 dark:text-error-500 transition-all duration-300"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-royal-600 dark:hover:text-royal-400 transition-all duration-300"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2 text-sm font-medium rounded-lg bg-royal-600 hover:bg-royal-700 text-white transition-all duration-300 shadow-soft-md"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg glass"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden glass-strong border-t border-white/10"
          >
            <div className="container mx-auto px-6 py-4 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-royal-600 dark:hover:text-royal-400 transition-all duration-300"
                >
                  {link.name}
                </Link>
              ))}
              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-royal-600 dark:hover:text-royal-400 transition-all duration-300"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full text-left py-2 text-sm font-medium text-red-400 hover:text-red-300 transition-all duration-300"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-royal-600 dark:hover:text-royal-400 transition-all duration-300"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block py-2 text-sm font-medium text-royal-600 hover:text-royal-500 transition-all duration-300"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
