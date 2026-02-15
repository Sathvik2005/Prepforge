/**
 * Socket.IO Authentication Middleware
 * Validates user authentication tokens during WebSocket handshake
 */

import { verifyFirebaseToken, isFirebaseEnabled } from '../config/firebase.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

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
 */
const isFirebaseToken = (token) => {
  try {
    if (!token || token.length < 100) return false;
    
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    return header.alg === 'RS256' && header.kid !== undefined;
  } catch {
    return false;
  }
};

/**
 * Socket.IO authentication middleware
 * Validates token from socket handshake auth object
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    // Get token from handshake auth
    const token = socket.handshake.auth?.token;
    
    if (!token) {
      console.warn('[Socket.IO] No token provided in handshake');
      // Allow connection but mark as unauthenticated
      socket.authenticated = false;
      socket.userId = null;
      return next();
    }

    // Detect token type and verify
    const useFirebase = isFirebaseEnabled() && isFirebaseToken(token);

    if (useFirebase) {
      // Firebase authentication
      try {
        const firebaseUser = await verifyFirebaseToken(token);
        
        // Find user in MongoDB
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

        // Attach user info to socket
        socket.authenticated = true;
        socket.userId = user._id.toString();
        socket.userEmail = user.email;
        socket.userName = user.name;
        socket.authMethod = 'firebase';

        console.log(`[Socket.IO] ✅ Firebase auth: ${user.email}`);
        return next();
      } catch (firebaseError) {
        console.warn('[Socket.IO] Firebase token verification failed:', firebaseError.message);
        socket.authenticated = false;
        socket.userId = null;
        return next();
      }
    }

    // JWT authentication (fallback)
    const decoded = verifyJWT(token);
    
    if (!decoded) {
      console.warn('[Socket.IO] Invalid JWT token');
      socket.authenticated = false;
      socket.userId = null;
      return next();
    }

    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      console.warn('[Socket.IO] Invalid token payload');
      socket.authenticated = false;
      socket.userId = null;
      return next();
    }

    // Verify user exists
    const user = await User.findById(userId);
    
    if (!user) {
      console.warn('[Socket.IO] User not found');
      socket.authenticated = false;
      socket.userId = null;
      return next();
    }

    // Attach user info to socket
    socket.authenticated = true;
    socket.userId = user._id.toString();
    socket.userEmail = user.email;
    socket.userName = user.name;
    socket.authMethod = 'jwt';

    console.log(`[Socket.IO] ✅ JWT auth: ${user.email}`);
    return next();

  } catch (error) {
    console.error('[Socket.IO] Authentication error:', error);
    socket.authenticated = false;
    socket.userId = null;
    return next(); // Allow connection but mark as unauthenticated
  }
};

/**
 * Helper to check if socket is authenticated
 * Use in event handlers to require authentication
 */
export const requireAuth = (socket) => {
  if (!socket.authenticated || !socket.userId) {
    throw new Error('Authentication required');
  }
  return true;
};

export default socketAuthMiddleware;
