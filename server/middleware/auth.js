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
 * Detect if token is a Firebase ID token
 * Firebase tokens have a specific structure with 3 parts and start with 'eyJ'
 */
const isFirebaseToken = (token) => {
  try {
    // Firebase tokens are longer (typically 800+ chars) and have specific structure
    if (!token || token.length < 100) return false;
    
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Decode the header to check if it's from Firebase
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    
    // Firebase tokens have 'RS256' algorithm and 'kid' field
    return header.alg === 'RS256' && header.kid !== undefined;
  } catch {
    return false;
  }
};

/**
 * Main authentication middleware
 * Intelligently routes between Firebase and JWT based on token format
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

    const token = authHeader.split(' ')[1].trim();

    if (!token) {
      return res.status(401).json({ message: 'Token is empty' });
    }

    // Detect token type and route accordingly
    const useFirebase = isFirebaseEnabled() && isFirebaseToken(token);

    // Strategy 1: Firebase authentication (for Firebase ID tokens)
    if (useFirebase) {
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
          uid: user._id.toString(), // Backward compatibility
          authMethod: 'firebase'
        };
        
        // Backward compatibility
        req.userId = user._id.toString();

        return next();
      } catch (firebaseError) {
        // Firebase verification failed
        console.warn('Firebase token verification failed:', firebaseError.message);
        return res.status(401).json({ 
          message: 'Invalid Firebase token',
          details: firebaseError.message
        });
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
      uid: user._id.toString(), // Backward compatibility
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
