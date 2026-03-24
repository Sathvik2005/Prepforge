import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Zap, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { registerWithEmail, loginWithGoogle, isFirebaseEnabled } from '../config/firebase';

const Register = () => {
  const navigate = useNavigate();
  const { login, updateToken } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    try {
      console.log('📝 Attempting registration...');

      // ── Firebase-first registration (no DB required) ──
      if (isFirebaseEnabled()) {
        try {
          const firebaseUser = await registerWithEmail(formData.email, formData.password);
          // REST API returns idToken directly
          const idToken = firebaseUser.idToken;
          login({
            uid: firebaseUser.uid, id: firebaseUser.uid, _id: firebaseUser.uid,
            email: firebaseUser.email,
            name: formData.name, displayName: formData.name,
            emailVerified: false,
            stats: { questionsSolved: 0, accuracy: 0, studyHours: 0, streak: 0, xp: 0 },
          }, idToken);
          toast.success('Account created successfully! 🎉');
          // Background: create user record in backend (gets long-lived JWT back)
          fetch(`${apiUrl}/auth/firebase-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken, name: formData.name }),
          })
            .then(r => r.json())
            .then(d => { if (d.token) updateToken(d.token); }) // swap in 30d backend JWT
            .catch(() => {});
          navigate('/dashboard');
          return;
        } catch (firebaseErr) {
          const code = firebaseErr?.code || '';
          // Credential errors (email-in-use, weak-password, invalid-email) → stop
          const isCredentialError = [
            'auth/email-already-in-use', 'auth/weak-password', 'auth/invalid-email',
          ].includes(code);
          if (isCredentialError) throw firebaseErr;
          // Network / config errors → fall through to direct backend
          console.warn('⚠️ Firebase unavailable, using direct auth:', code || firebaseErr.message);
        }
      }

      // ── Fallback: direct backend registration ──
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed');
      login({
        uid: data.user.id, id: data.user.id, _id: data.user.id,
        email: data.user.email, name: data.user.name, displayName: data.user.name,
        emailVerified: data.user.emailVerified ?? true,
        stats: data.user.stats || { questionsSolved: 0, accuracy: 0, studyHours: 0, streak: 0, xp: 0 },
      }, data.token);
      toast.success('Account created successfully! 🎉');
      navigate('/dashboard');

    } catch (error) {
      console.error('❌ Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError('');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    try {
      const firebaseUser = await loginWithGoogle();
      const idToken = await getCurrentUserToken(true);
      login({
        uid: firebaseUser.uid, id: firebaseUser.uid, _id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        emailVerified: firebaseUser.emailVerified || false,
        stats: { questionsSolved: 0, accuracy: 0, studyHours: 0, streak: 0, xp: 0 },
      }, idToken);
      toast.success('Account created! Welcome 🎉');
      // Background sync
      fetch(`${apiUrl}/auth/firebase-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }).catch(() => {});
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      let msg = err?.message || 'Google sign-up failed';
      if (err?.code === 'auth/configuration-not-found' || err?.code === 'auth/operation-not-allowed') {
        msg = 'Google sign-in is not available in this environment. Please use email and password.';
      } else if (typeof msg === 'string' && msg.startsWith('Firebase:')) {
        msg = 'Google sign-up failed. Please use email and password instead.';
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setGoogleLoading(false);
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
            Join PrepForge
          </h1>
          <p className="text-surface-500 dark:text-surface-400 text-center mb-8">
            Start your interview preparation journey today
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-navy-900 dark:text-white">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-navy-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2 text-navy-900 dark:text-white">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-navy-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-transparent transition-all"
                />
              </div>
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
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-surface-300 dark:border-surface-600"></div>
            <span className="px-4 text-sm text-surface-500">or continue with</span>
            <div className="flex-1 border-t border-surface-300 dark:border-surface-600"></div>
          </div>

          {/* Google Sign-Up */}
          <motion.button
            type="button"
            disabled={googleLoading || loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleSignUp}
            className="w-full py-3 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-navy-900 dark:text-white font-semibold transition-all duration-300 shadow-sm flex items-center justify-center space-x-3 hover:bg-surface-50 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{googleLoading ? 'Signing up…' : 'Continue with Google'}</span>
          </motion.button>

          {/* Sign In Link */}
          <p className="text-center text-surface-600 dark:text-surface-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-royal-600 hover:text-royal-700 dark:text-royal-400 dark:hover:text-royal-300 font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
