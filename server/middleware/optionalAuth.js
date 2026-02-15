/**
 * Optional Authentication Middleware
 * Adds user info to request if token is present, but doesn't block if not authenticated
 */

import admin from '../config/firebase.js';

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
      } catch (error) {
        // Token invalid, but we don't block the request
        console.log('Optional auth: Invalid token, proceeding without user');
      }
    }
    
    // Always continue to next middleware/route
    next();
  } catch (error) {
    // Any error, just continue without user
    next();
  }
};
