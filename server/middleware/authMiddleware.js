/**
 * Dual Authentication Middleware
 * Supports both JWT and Firebase authentication
 */

import jwt from 'jsonwebtoken';
import { verifyFirebaseToken, isFirebaseEnabled } from '../config/firebase.js';
import User from '../models/User.js';

/**
 * Verify JWT token
 */
const verifyJWT = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Main authentication middleware
 * Tries Firebase first (if enabled), falls back to JWT
 */
export const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Strategy 1: Try Firebase authentication (if enabled)
    if (isFirebaseEnabled()) {
      try {
        const firebaseUser = await verifyFirebaseToken(token);
        
        // Find or create user in MongoDB
        let user = await User.findOne({ email: firebaseUser.email });
        
        if (!user) {
          // Auto-create user from Firebase
          user = new User({
            name: firebaseUser.name || firebaseUser.email.split('@')[0],
            email: firebaseUser.email,
            firebaseUid: firebaseUser.uid,
            emailVerified: firebaseUser.emailVerified
          });
          await user.save();
        }

        req.user = {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          firebaseUid: firebaseUser.uid,
          authMethod: 'firebase'
        };

        return next();
      } catch (firebaseError) {
        // Firebase verification failed, try JWT
        console.log('Firebase auth failed, trying JWT:', firebaseError.message);
      }
    }

    // Strategy 2: JWT authentication (fallback)
    const decoded = verifyJWT(token);
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Verify user exists
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      authMethod: 'jwt'
    };

    next();

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't block request
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    // Try Firebase
    if (isFirebaseEnabled()) {
      try {
        const firebaseUser = await verifyFirebaseToken(token);
        const user = await User.findOne({ email: firebaseUser.email });
        
        if (user) {
          req.user = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            authMethod: 'firebase'
          };
        }
        
        return next();
      } catch (firebaseError) {
        // Continue to JWT
      }
    }

    // Try JWT
    const decoded = verifyJWT(token);
    if (decoded) {
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          authMethod: 'jwt'
        };
      }
    }

    next();
  } catch (error) {
    // Don't block request, just log error
    console.error('Optional auth error:', error);
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await User.findById(req.user.id);
      
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Authorization error', error: error.message });
    }
  };
};

// Export default for backward compatibility
export default authMiddleware;
