/**
 * AuthContext - Provides authentication context using Zustand store
 * This is a compatibility layer that wraps useAuthStore for components expecting React Context
 */

import { createContext, useContext } from 'react';
import { useAuthStore } from '../store/authStore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // This component is not needed since we use Zustand
  // but we export it for compatibility
  return children;
};

/**
 * useAuth hook - Returns current user and authentication status
 * Maps Zustand store to Context API format
 */
export const useAuth = () => {
  const { user, token, isAuthenticated, login, logout, updateUser } = useAuthStore();

  return {
    currentUser: user, // Map 'user' to 'currentUser' for DSASheets compatibility
    user,
    token,
    isAuthenticated,
    login,
    logout,
    updateUser,
  };
};

export default AuthContext;
