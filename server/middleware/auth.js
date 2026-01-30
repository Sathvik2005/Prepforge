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
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization || req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'No token provided',
        details: 'Authorization header must be in format: Bearer <token>'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token is empty' });
    }

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
        
        // Backward compatibility
        req.userId = user._id.toString();

        return next();
      } catch (firebaseError) {
        // Firebase verification failed, try JWT
        console.log('Firebase auth failed, trying JWT:', firebaseError.message);
      }
    }

    // Strategy 2: JWT authentication (fallback)
    const decoded = verifyJWT(token);
    
    if (!decoded) {
      return res.status(401).json({ 
        message: 'Invalid or expired token',
        details: 'Please log in again to get a new token'
      });
    }

    // Support both userId and id fields in JWT
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    // Verify user exists
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(401).json({ 
        message: 'User not found',
        details: 'The user associated with this token no longer exists'
      });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      authMethod: 'jwt'
    };
    
    // Backward compatibility
    req.userId = user._id.toString();

    next();

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      message: 'Authentication failed', 
      error: error.message 
    });
  }
};

export { authMiddleware };
export default authMiddleware;
