/**
 * Firebase Client Configuration
 * For frontend authentication and real-time features
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  sendPasswordResetEmail
} from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if Firebase is configured
const isFirebaseConfigured = Object.values(firebaseConfig).every(val => val && val !== 'undefined');

// Initialize Firebase only if configured
let app = null;
let auth = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    console.log('✅ Firebase initialized');
  } catch (error) {
    console.warn('⚠️ Firebase initialization failed:', error.message);
  }
}

/**
 * Check if Firebase is enabled (API key is enough for email/password REST auth)
 */
export const isFirebaseEnabled = () => {
  const key = import.meta.env.VITE_FIREBASE_API_KEY;
  return !!(key && key !== 'undefined' && key !== 'your_web_api_key');
};

/**
 * Sign in with email and password — uses REST API to bypass SDK auth/configuration-not-found
 */
export const loginWithEmail = async (email, password) => {
  const key = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!key || key === 'undefined') throw new Error('Firebase API key not configured');
  let resp, data;
  try {
    resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    data = await resp.json();
  } catch (networkErr) {
    // Network / CORS issue — surface with a recognisable code so callers can fall through
    throw Object.assign(new Error('Network error reaching Firebase. Check your connection.'), { code: 'auth/network-request-failed' });
  }
  if (!resp.ok) {
    const m = data.error?.message || '';
    if (/INVALID_LOGIN_CREDENTIALS|EMAIL_NOT_FOUND|INVALID_PASSWORD/.test(m))
      throw Object.assign(new Error('Invalid email or password.'), { code: 'auth/invalid-credential' });
    if (/TOO_MANY_ATTEMPTS/.test(m))
      throw Object.assign(new Error('Too many failed attempts. Please try again later.'), { code: 'auth/too-many-requests' });
    if (/USER_DISABLED/.test(m))
      throw Object.assign(new Error('This account has been disabled.'), { code: 'auth/user-disabled' });
    if (/INVALID_EMAIL/.test(m))
      throw Object.assign(new Error('Invalid email address.'), { code: 'auth/invalid-email' });
    throw Object.assign(new Error(data.error?.message || 'Sign-in failed'), { code: 'auth/unknown' });
  }
  return {
    uid: data.localId,
    email: data.email,
    displayName: data.displayName || data.email.split('@')[0],
    emailVerified: data.emailVerified || false,
    isAnonymous: false,
    idToken: data.idToken,           // ← token included directly, no getCurrentUserToken needed
    refreshToken: data.refreshToken,
  };
};

/**
 * Register with email and password — uses REST API to bypass SDK auth/configuration-not-found
 */
export const registerWithEmail = async (email, password) => {
  const key = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!key || key === 'undefined') throw new Error('Firebase API key not configured');
  let resp, data;
  try {
    resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    data = await resp.json();
  } catch (networkErr) {
    throw Object.assign(new Error('Network error reaching Firebase. Check your connection.'), { code: 'auth/network-request-failed' });
  }
  if (!resp.ok) {
    const m = data.error?.message || '';
    if (/EMAIL_EXISTS/.test(m))
      throw Object.assign(new Error('An account with this email already exists.'), { code: 'auth/email-already-in-use' });
    if (/WEAK_PASSWORD/.test(m))
      throw Object.assign(new Error('Password must be at least 6 characters.'), { code: 'auth/weak-password' });
    if (/INVALID_EMAIL/.test(m))
      throw Object.assign(new Error('Invalid email address.'), { code: 'auth/invalid-email' });
    throw Object.assign(new Error(data.error?.message || 'Registration failed'), { code: 'auth/unknown' });
  }
  return {
    uid: data.localId,
    email: data.email,
    displayName: data.displayName || data.email.split('@')[0],
    emailVerified: false,
    isAnonymous: false,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
  };
};

/**
 * Sign in with Google
 */
export const loginWithGoogle = async () => {
  if (!auth || !googleProvider) throw new Error('Google sign-in is not available. Please use email and password.');
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    const code = error?.code || '';
    if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
      throw Object.assign(
        new Error('Google sign-in is not enabled. Please use email and password instead.'),
        { code }
      );
    }
    throw error;
  }
};

/**
 * Anonymous / Guest sign-in
 */
export const loginAnonymously = async () => {
  if (!auth) throw new Error('Guest sign-in is not available. Please use email and password.');
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    const code = error?.code || '';
    if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
      throw Object.assign(
        new Error('Guest sign-in is not enabled. Please use email and password instead.'),
        { code }
      );
    }
    throw error;
  }
};

/**
 * Sign out
 */
export const logout = async () => {
  if (!auth) throw new Error('Firebase not configured');
  await signOut(auth);
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
  if (!auth) throw new Error('Firebase not configured');
  await sendPasswordResetEmail(auth, email);
};

/**
 * Listen to auth state changes
 */
export const onAuthChange = (callback) => {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
};

/**
 * Get current user's ID token (force refresh)
 */
export const getCurrentUserToken = async (forceRefresh = true) => {
  if (!auth || !auth.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken(forceRefresh);
  } catch (error) {
    console.error('Error getting Firebase token:', error);
    return null;
  }
};

/**
 * Get current Firebase user
 */
export const getCurrentUser = () => {
  if (!auth) return null;
  return auth.currentUser;
};

export { auth, googleProvider };

export default {
  isFirebaseEnabled,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logout,
  resetPassword,
  onAuthChange,
  getCurrentUserToken,
  getCurrentUser
};
