import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Zap, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { loginWithEmail, loginWithGoogle, loginAnonymously, isFirebaseEnabled, getCurrentUserToken } from '../config/firebase';

const Login = () => {
  const navigate = useNavigate();
  const { login, updateUser, updateToken } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  // Build a user object directly from a Firebase user — no backend required
  const buildUserFromFirebase = (fbUser) => ({
    uid: fbUser.uid,
    id: fbUser.uid,
    _id: fbUser.uid,
    email: fbUser.email || `guest-${fbUser.uid.slice(0, 8)}@prepwiser.local`,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
    displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
    emailVerified: fbUser.emailVerified || false,
    isAnonymous: fbUser.isAnonymous || false,
    stats: { questionsSolved: 0, accuracy: 0, studyHours: 0, streak: 0, xp: 0 },
  });

  // Fire-and-forget: load real stats + swap in long-lived backend JWT
  const syncWithBackend = (apiUrl, idToken) => {
    fetch(`${apiUrl}/auth/firebase-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.user?.stats) updateUser({ stats: data.user.stats });
        if (data.token) updateToken(data.token); // ← long-lived 30d JWT replaces 1h Firebase token
      })
      .catch(() => {});
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
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    try {
      // ── Firebase-first: login completes without needing the backend DB ──
      if (isFirebaseEnabled()) {
        try {
          const firebaseUser = await loginWithEmail(formData.email, formData.password);
          // REST API returns idToken directly — no need to call getCurrentUserToken
          const idToken = firebaseUser.idToken;
          login(buildUserFromFirebase(firebaseUser), idToken);
          toast.success('Login successful! Welcome back 🎉');
          syncWithBackend(apiUrl, idToken);
          navigate('/dashboard');
          return;
        } catch (firebaseErr) {
          const code = firebaseErr?.code || '';
          // Real credential errors → stop and show to user
          const isCredentialError = [
            'auth/invalid-credential', 'auth/too-many-requests',
            'auth/user-disabled', 'auth/invalid-email', 'auth/weak-password',
          ].includes(code);
          if (isCredentialError) throw firebaseErr;
          // Network / config errors → fall through to direct backend auth
          console.warn('⚠️ Firebase unavailable, falling back to direct auth:', code || firebaseErr.message);
        }
      }

      // ── Fallback: direct backend JWT login (requires server + DB) ──
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');
      login({
        uid: data.user.id, id: data.user.id, _id: data.user.id,
        email: data.user.email, name: data.user.name, displayName: data.user.name,
        emailVerified: data.user.emailVerified ?? true,
        stats: data.user.stats || { questionsSolved: 0, accuracy: 0, studyHours: 0, streak: 0, xp: 0 },
      }, data.token);
      toast.success('Login successful! Welcome back 🎉');
      navigate('/dashboard');

    } catch (error) {
      console.error('❌ Login error:', error);
      setError(error.message || 'Invalid credentials. Please try again.');
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (firebaseSignIn, loadingSetter, label) => {
    loadingSetter(true);
    setError('');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    try {
      const firebaseUser = await firebaseSignIn();
      const idToken = await getCurrentUserToken(true);
      login(buildUserFromFirebase(firebaseUser), idToken);
      toast.success(`${label} successful! Welcome 🎉`);
      syncWithBackend(apiUrl, idToken); // load real stats in background
      setTimeout(() => navigate('/dashboard'), 300);
    } catch (err) {
      console.error(`❌ ${label} error:`, err);
      let msg = err?.message || `${label} failed`;
      // Replace raw Firebase SDK error strings with user-friendly messages
      if (err?.code === 'auth/configuration-not-found' || err?.code === 'auth/operation-not-allowed') {
        msg = `${label} is not available in this environment. Please use email and password.`;
      } else if (typeof msg === 'string' && msg.startsWith('Firebase:')) {
        msg = `${label} failed. Please try email and password instead.`;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      loadingSetter(false);
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
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-surface-300 dark:border-surface-600"></div>
            <span className="px-4 text-sm text-surface-500">or continue with</span>
            <div className="flex-1 border-t border-surface-300 dark:border-surface-600"></div>
          </div>

          {/* Social Sign-In Buttons */}
          <div className="space-y-3 mb-6">
            {/* Google */}
            <motion.button
              type="button"
              disabled={googleLoading || loading || guestLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSocialLogin(loginWithGoogle, setGoogleLoading, 'Google sign-in')}
              className="w-full py-3 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-navy-900 dark:text-white font-semibold transition-all duration-300 shadow-sm flex items-center justify-center space-x-3 hover:bg-surface-50 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <span>{googleLoading ? 'Signing in…' : 'Continue with Google'}</span>
            </motion.button>

            {/* Guest / Anonymous */}
            <motion.button
              type="button"
              disabled={guestLoading || loading || googleLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSocialLogin(loginAnonymously, setGuestLoading, 'Guest sign-in')}
              className="w-full py-3 rounded-xl border border-dashed border-surface-300 dark:border-surface-600 bg-transparent text-surface-600 dark:text-surface-400 font-medium transition-all duration-300 flex items-center justify-center space-x-2 hover:bg-surface-50 dark:hover:bg-surface-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guestLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              <span>{guestLoading ? 'Signing in…' : 'Continue as Guest'}</span>
            </motion.button>
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
