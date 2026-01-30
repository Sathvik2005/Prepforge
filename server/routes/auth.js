import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { verifyFirebaseToken, isFirebaseEnabled } from '../config/firebase.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = new User({ name, email, password });
    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // Update last active
    user.stats.lastActive = Date.now();
    await user.save();

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        stats: user.stats,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Firebase Login
router.post('/firebase-login', async (req, res) => {
  try {
    if (!isFirebaseEnabled()) {
      return res.status(503).json({ message: 'Firebase authentication not configured' });
    }

    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'Firebase ID token required' });
    }

    // Verify Firebase token
    const firebaseUser = await verifyFirebaseToken(idToken);

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
    } else {
      // Update Firebase UID if not set
      if (!user.firebaseUid) {
        user.firebaseUid = firebaseUser.uid;
        await user.save();
      }
    }

    // Generate JWT token for API access
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // Update last active
    user.stats.lastActive = Date.now();
    await user.save();

    res.json({
      message: 'Firebase login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        stats: user.stats,
      },
      authMethod: 'firebase'
    });

  } catch (error) {
    res.status(401).json({ message: 'Firebase authentication failed', error: error.message });
  }
});

// Firebase Register
router.post('/firebase-register', async (req, res) => {
  try {
    if (!isFirebaseEnabled()) {
      return res.status(503).json({ message: 'Firebase authentication not configured' });
    }

    const { idToken, name, email } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'Firebase ID token required' });
    }

    // Verify Firebase token
    const firebaseUser = await verifyFirebaseToken(idToken);

    // Check if user already exists
    let user = await User.findOne({ email: firebaseUser.email });

    if (user) {
      return res.status(400).json({ message: 'User already exists. Please login instead.' });
    }

    // Create new user
    user = new User({
      name: name || firebaseUser.name || firebaseUser.email.split('@')[0],
      email: firebaseUser.email,
      firebaseUid: firebaseUser.uid,
      emailVerified: firebaseUser.emailVerified
    });
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      message: 'Firebase registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
      },
      authMethod: 'firebase'
    });

  } catch (error) {
    res.status(500).json({ message: 'Firebase registration failed', error: error.message });
  }
});

export default router;
