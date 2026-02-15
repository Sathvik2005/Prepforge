/**
 * Firebase Admin SDK Configuration
 * Handles server-side Firebase authentication and services
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 */
export const initializeFirebase = () => {
  if (firebaseApp) {
    console.log('✅ Firebase already initialized');
    return firebaseApp;
  }

  try {
    // Check if required environment variables exist
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.warn('⚠️  Firebase credentials not configured. Using JWT authentication only.');
      return null;
    }

    // Initialize Firebase Admin with service account
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log('   Project ID:', process.env.FIREBASE_PROJECT_ID);
    return firebaseApp;

  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    console.warn('⚠️  Continuing with JWT authentication only');
    return null;
  }
};

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token
 * @returns {Promise<object>} Decoded token with user info
 */
export const verifyFirebaseToken = async (idToken) => {
  try {
    if (!firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    if (!idToken || typeof idToken !== 'string') {
      throw new Error('Invalid token format: token must be a string');
    }

    // Validate token structure (3 parts separated by dots)
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format: must have 3 parts (header.payload.signature)');
    }

    // Attempt to verify the token
    const decodedToken = await admin.auth().verifyIdToken(idToken, true); // checkRevoked = true
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified || false,
      name: decodedToken.name || decodedToken.email?.split('@')[0],
      picture: decodedToken.picture,
      firebaseUser: true
    };
  } catch (error) {
    // Provide more specific error messages
    if (error.code === 'auth/id-token-expired') {
      throw new Error('Token has expired. Please sign in again.');
    } else if (error.code === 'auth/id-token-revoked') {
      throw new Error('Token has been revoked. Please sign in again.');
    } else if (error.code === 'auth/argument-error') {
      throw new Error('Token format is invalid. This is not a valid Firebase ID token.');
    } else if (error.code === 'auth/invalid-id-token') {
      throw new Error('Token is invalid or malformed.');
    }
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * Create custom Firebase token for a user
 * @param {string} uid - User ID
 * @returns {Promise<string>} Custom token
 */
export const createCustomToken = async (uid) => {
  try {
    if (!firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    const customToken = await admin.auth().createCustomToken(uid);
    return customToken;
  } catch (error) {
    throw new Error(`Custom token creation failed: ${error.message}`);
  }
};

/**
 * Get Firebase user by email
 * @param {string} email - User email
 * @returns {Promise<object>} User record
 */
export const getFirebaseUserByEmail = async (email) => {
  try {
    if (!firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    const userRecord = await admin.auth().getUserByEmail(email);
    return userRecord;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    throw error;
  }
};

/**
 * Create Firebase user
 * @param {object} userData - User data {email, password, displayName}
 * @returns {Promise<object>} User record
 */
export const createFirebaseUser = async (userData) => {
  try {
    if (!firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    const userRecord = await admin.auth().createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.name,
      emailVerified: false
    });

    return userRecord;
  } catch (error) {
    throw new Error(`Firebase user creation failed: ${error.message}`);
  }
};

/**
 * Delete Firebase user
 * @param {string} uid - User ID
 */
export const deleteFirebaseUser = async (uid) => {
  try {
    if (!firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    await admin.auth().deleteUser(uid);
  } catch (error) {
    throw new Error(`Firebase user deletion failed: ${error.message}`);
  }
};

/**
 * Check if Firebase is enabled
 * @returns {boolean}
 */
export const isFirebaseEnabled = () => {
  return firebaseApp !== null;
};

export default {
  initializeFirebase,
  verifyFirebaseToken,
  createCustomToken,
  getFirebaseUserByEmail,
  createFirebaseUser,
  deleteFirebaseUser,
  isFirebaseEnabled
};
