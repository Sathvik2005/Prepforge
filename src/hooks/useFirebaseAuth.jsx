/**
 * Firebase Authentication Hook
 * Provides Firebase auth functionality to React components
 */

import { useState, useEffect } from 'react';
import { 
  isFirebaseEnabled, 
  loginWithEmail, 
  registerWithEmail, 
  loginWithGoogle, 
  logout, 
  resetPassword,
  onAuthChange,
  getCurrentUserToken
} from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';

export const useFirebaseAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const { login: storeLogin, logout: storeLogout } = useAuthStore();

  // Listen to Firebase auth state changes
  useEffect(() => {
    if (!isFirebaseEnabled()) return;

    const unsubscribe = onAuthChange(async (user) => {
      setFirebaseUser(user);
      
      if (user) {
        try {
          // Get Firebase ID token
          const idToken = await getCurrentUserToken();
          
          // Send to backend to sync with MongoDB
          const response = await authAPI.firebaseLogin(idToken);
          
          // Update local auth store
          storeLogin(response.data.user, response.data.token);
        } catch (error) {
          console.error('Firebase sync error:', error);
        }
      } else {
        storeLogout();
      }
    });

    return () => unsubscribe();
  }, [storeLogin, storeLogout]);

  /**
   * Sign in with email and password
   */
  const signInWithEmail = async (email, password) => {
    if (!isFirebaseEnabled()) {
      throw new Error('Firebase not configured. Using JWT authentication.');
    }

    setLoading(true);
    setError(null);

    try {
      const user = await loginWithEmail(email, password);
      const idToken = await getCurrentUserToken();
      
      // Sync with backend
      const response = await authAPI.firebaseLogin(idToken);
      storeLogin(response.data.user, response.data.token);
      
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign up with email and password
   */
  const signUpWithEmail = async (email, password, name) => {
    if (!isFirebaseEnabled()) {
      throw new Error('Firebase not configured. Using JWT authentication.');
    }

    setLoading(true);
    setError(null);

    try {
      const user = await registerWithEmail(email, password);
      const idToken = await getCurrentUserToken();
      
      // Sync with backend (create MongoDB user)
      const response = await authAPI.firebaseRegister({
        idToken,
        name,
        email
      });
      
      storeLogin(response.data.user, response.data.token);
      
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with Google
   */
  const signInWithGoogle = async () => {
    if (!isFirebaseEnabled()) {
      throw new Error('Firebase not configured. Using JWT authentication.');
    }

    setLoading(true);
    setError(null);

    try {
      const user = await loginWithGoogle();
      const idToken = await getCurrentUserToken();
      
      // Sync with backend
      const response = await authAPI.firebaseLogin(idToken);
      storeLogin(response.data.user, response.data.token);
      
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    if (!isFirebaseEnabled()) return;

    setLoading(true);
    setError(null);

    try {
      await logout();
      storeLogout();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send password reset email
   */
  const sendPasswordReset = async (email) => {
    if (!isFirebaseEnabled()) {
      throw new Error('Firebase not configured. Use JWT password reset.');
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword(email);
      return { success: true, message: 'Password reset email sent' };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    loading,
    error,
    firebaseUser,
    isFirebaseEnabled: isFirebaseEnabled(),
    
    // Methods
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    sendPasswordReset
  };
};
