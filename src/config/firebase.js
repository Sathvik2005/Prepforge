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
 * Check if Firebase is enabled
 */
export const isFirebaseEnabled = () => {
  return auth !== null;
};

/**
 * Sign in with email and password
 */
export const loginWithEmail = async (email, password) => {
  if (!auth) throw new Error('Firebase not configured');
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

/**
 * Sign up with email and password
 */
export const registerWithEmail = async (email, password) => {
  if (!auth) throw new Error('Firebase not configured');
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

/**
 * Sign in with Google
 */
export const loginWithGoogle = async () => {
  if (!auth || !googleProvider) throw new Error('Firebase not configured');
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
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
 * Get current user's ID token
 */
export const getCurrentUserToken = async () => {
  if (!auth || !auth.currentUser) return null;
  return await auth.currentUser.getIdToken();
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
  getCurrentUserToken
};
