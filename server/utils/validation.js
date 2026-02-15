/**
 * Input Validation Utilities
 * Sanitizes and validates user input
 */

/**
 * Sanitize text input to prevent XSS
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validate URL format
 */
export const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Validate temperature parameter (0-1)
 */
export const validateTemperature = (temp) => {
  const temperature = parseFloat(temp);
  if (isNaN(temperature)) return 0.7;
  return Math.max(0, Math.min(1, temperature));
};

/**
 * Validate max tokens parameter
 */
export const validateMaxTokens = (tokens) => {
  const maxTokens = parseInt(tokens);
  if (isNaN(maxTokens)) return 1000;
  return Math.max(100, Math.min(4000, maxTokens));
};

/**
 * Sanitize filename
 */
export const sanitizeFilename = (filename) => {
  if (!filename || typeof filename !== 'string') return 'file';
  
  // Remove path separators and dangerous characters
  let sanitized = filename.replace(/[\/\\<>:"|?*\x00-\x1f]/g, '_');
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    sanitized = sanitized.substring(0, 250) + '.' + ext;
  }
  
  return sanitized;
};

/**
 * Validate text length
 */
export const validateTextLength = (text, maxLength = 50000) => {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Text is required' };
  }
  
  if (text.length < 10) {
    return { valid: false, error: 'Text is too short (minimum 10 characters)' };
  }
  
  if (text.length > maxLength) {
    return { valid: false, error: `Text is too long (maximum ${maxLength} characters)` };
  }
  
  return { valid: true };
};

/**
 * Check for potentially malicious content
 */
export const containsMaliciousContent = (text) => {
  if (!text || typeof text !== 'string') return false;
  
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onclick=/i,
    /onload=/i,
    /<iframe/i,
    /eval\(/i,
    /expression\(/i
  ];
  
  return maliciousPatterns.some(pattern => pattern.test(text));
};

export default {
  sanitizeText,
  isValidEmail,
  isValidUrl,
  validateTemperature,
  validateMaxTokens,
  sanitizeFilename,
  validateTextLength,
  containsMaliciousContent
};
