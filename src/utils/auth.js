/**
 * Unified Authentication Utilities
 * Handles token retrieval from multiple storage formats
 * Ensures backward compatibility with both Firebase and JWT auth
 */

/**
 * Get authentication token from localStorage
 * Checks multiple sources for backward compatibility:
 * 1. Firebase auth-storage (new format)
 * 2. Direct token storage (legacy format)
 * 
 * @returns {string|null} Authentication token or null if not found
 */
export const getAuthToken = () => {
  try {
    // Strategy 1: Check Firebase auth-storage (primary)
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      const token = parsed?.state?.token;
      
      if (token && typeof token === 'string' && token.length > 0) {
        return token.trim();
      }
    }
  } catch (error) {
    console.warn('Error reading auth-storage:', error);
  }

  try {
    // Strategy 2: Check direct token storage (legacy fallback)
    const token = localStorage.getItem('token');
    if (token && typeof token === 'string' && token.length > 0) {
      return token.trim();
    }
  } catch (error) {
    console.warn('Error reading token:', error);
  }

  return null;
};

/**
 * Get user ID from localStorage
 * Checks multiple sources for backward compatibility
 * 
 * @returns {string|null} User ID or null if not found
 */
export const getUserId = () => {
  try {
    // Strategy 1: Check Firebase auth-storage
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      const userId = parsed?.state?.user?.uid || parsed?.state?.user?.id;
      
      if (userId) {
        return userId;
      }
    }
  } catch (error) {
    console.warn('Error reading user from auth-storage:', error);
  }

  try {
    // Strategy 2: Check direct user storage (legacy)
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      return parsed?.uid || parsed?.id || parsed?._id;
    }
  } catch (error) {
    console.warn('Error reading user:', error);
  }

  return null;
};

/**
 * Check if user is authenticated
 * 
 * @returns {boolean} True if user has valid token
 */
export const isAuthenticated = () => {
  const token = getAuthToken();
  return token !== null && token.length > 0;
};

/**
 * Create authorization header object
 * 
 * @returns {Object} Headers object with Authorization bearer token
 */
export const getAuthHeaders = () => {
  const token = getAuthToken();
  
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

/**
 * Clear all authentication data
 * Removes both Firebase and legacy auth data
 */
export const clearAuth = () => {
  try {
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('Authentication data cleared');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

/**
 * Store authentication token
 * Supports both formats for backward compatibility
 * 
 * @param {string} token - Authentication token
 * @param {Object} user - User data object
 */
export const setAuthToken = (token, user = null) => {
  try {
    // Store in legacy format for backward compatibility
    localStorage.setItem('token', token);
    
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }

    console.log('Authentication token stored');
  } catch (error) {
    console.error('Error storing auth token:', error);
  }
};
