import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Zap, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting login...');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();
      console.log('Response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      console.log('✅ Login successful, storing credentials...');
      
      // Store user and token in authStore
      const userData = {
        uid: data.user.id,
        email: data.user.email,
        displayName: data.user.name,
        emailVerified: true
      };
      
      login(userData, data.token);
      
      toast.success('Login successful! Welcome back 🎉');
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
      
    } catch (error) {
      console.error('❌ Login error:', error);
      setError(error.message || 'Invalid credentials. Please try again.');
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-20 pb-12">
      {/* Subtle Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-royal-500/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-navy-600/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-strong rounded-3xl p-8 md:p-12 border border-surface-200 dark:border-surface-700">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-royal-600 rounded-2xl flex items-center justify-center shadow-soft-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 text-navy-900 dark:text-white">
            Welcome Back
          </h1>
          <p className="text-surface-500 dark:text-surface-400 text-center mb-8">
            Continue your interview preparation journey
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2 text-navy-900 dark:text-white">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-navy-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2 text-navy-900 dark:text-white">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-navy-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-royal-600 hover:text-royal-700 dark:text-royal-400 dark:hover:text-royal-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-royal-600 hover:bg-royal-700 text-white font-semibold transition-all duration-300 shadow-soft-md flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center">
            <div className="flex-1 border-t border-surface-300 dark:border-surface-600"></div>
            <span className="px-4 text-sm text-surface-500">or</span>
            <div className="flex-1 border-t border-surface-300 dark:border-surface-600"></div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-surface-600 dark:text-surface-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-royal-600 hover:text-royal-700 dark:text-royal-400 dark:hover:text-royal-300 font-semibold transition-colors"
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
