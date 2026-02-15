/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse
 */

import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

/**
 * Authentication rate limiter
 * 5 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many login attempts, please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * File upload rate limiter
 * 10 uploads per hour per IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Too many file uploads, please try again after an hour.',
    retryAfter: '1 hour'
  },
});

/**
 * AI analysis rate limiter
 * 20 requests per hour per IP (more expensive operations)
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    error: 'Too many AI requests, please try again after an hour.',
    retryAfter: '1 hour'
  },
});

export default {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  aiLimiter
};
