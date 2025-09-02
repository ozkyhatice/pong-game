/**
 * Security utilities for the user module
 * Provides protection against XSS and SQL injection attacks
 */
import { escapeHTML, sanitizeInput } from '../../../utils/security.js';
import { containsSqlInjection, isValidUsername, isValidEmail } from '../../../utils/validation.js';

/**
 * Sanitizes user input data to prevent XSS attacks
 * @param {Object} data - The input data object
 * @returns {Object} - Sanitized data object
 */
export function sanitizeUserInput(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sanitized = { ...data };
  
  // Sanitize common fields
  if (sanitized.username && typeof sanitized.username === 'string') {
    sanitized.username = sanitizeInput(sanitized.username);
  }
  
  if (sanitized.email && typeof sanitized.email === 'string') {
    sanitized.email = sanitizeInput(sanitized.email);
  }
  
  if (sanitized.id && typeof sanitized.id === 'string') {
    sanitized.id = sanitizeInput(sanitized.id);
  }
  
  return sanitized;
}

/**
 * Validates user input data to prevent SQL injection
 * @param {Object} data - The input data object
 * @returns {Object} - Validation result {isValid: boolean, message: string}
 */
export function validateUserInput(data) {
  if (!data) {
    return { isValid: false, message: 'No data provided' };
  }
  
  // Check for SQL injection in string fields
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && containsSqlInjection(value)) {
      return { 
        isValid: false, 
        message: `Suspicious input detected in ${key}` 
      };
    }
  }
  
  // Validate username if present
  if (data.username !== undefined) {
    if (!isValidUsername(data.username)) {
      return { 
        isValid: false, 
        message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores' 
      };
    }
  }
  
  // Validate email if present
  if (data.email !== undefined) {
    if (!isValidEmail(data.email)) {
      return { 
        isValid: false, 
        message: 'Please provide a valid email address' 
      };
    }
  }
  
  return { isValid: true, message: 'Input is valid' };
}

/**
 * Checks if a userId is valid to prevent injection attacks
 * @param {string} userId - The userId to validate
 * @returns {boolean} - Whether the userId is valid
 */
export function isValidUserId(userId) {
  // User IDs should be integers in this application
  return !isNaN(parseInt(userId)) && parseInt(userId).toString() === userId.toString();
}

/**
 * Prepares parameters for SQL queries to prevent SQL injection
 * @param {Array} params - Array of parameters to prepare
 * @returns {Array} - Array of sanitized parameters
 */
export function prepareSqlParams(params) {
  if (!Array.isArray(params)) {
    return [];
  }
  
  return params.map(param => {
    if (typeof param === 'string') {
      // Remove any potential SQL injection patterns
      return param.replace(/['";]/g, '');
    }
    return param;
  });
}

/**
 * Sanitizes a user profile object for safe client-side consumption
 * @param {Object} user - The user object to sanitize
 * @returns {Object} - The sanitized user object
 */
export function sanitizeUserProfile(user) {
  if (!user || typeof user !== 'object') {
    return user;
  }
  
  // Create a safe copy of the user object with sanitized fields
  const sanitizedUser = { ...user };
  
  // Sanitize specific fields that might contain user-provided content
  if (sanitizedUser.username) {
    sanitizedUser.username = escapeHTML(sanitizedUser.username);
  }
  
  if (sanitizedUser.email) {
    sanitizedUser.email = escapeHTML(sanitizedUser.email);
  }
  
  if (sanitizedUser.avatar) {
    sanitizedUser.avatar = escapeHTML(sanitizedUser.avatar);
  }
  
  // Remove sensitive fields that should never be sent to the client
  delete sanitizedUser.password;
  delete sanitizedUser.twoFASecret;
  
  return sanitizedUser;
}
