/**
 * Security utilities for the game module
 * Provides XSS and SQL injection protection
 */
import { escapeHTML, sanitizeInput } from '../../../utils/security.js';
import { containsSqlInjection } from '../../../utils/validation.js';

/**
 * Sanitizes game input data to prevent XSS attacks
 * @param {Object} data - The input data object
 * @returns {Object} - Sanitized data object
 */
export function sanitizeGameInput(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sanitized = { ...data };
  
  // Sanitize common fields
  if (sanitized.roomId && typeof sanitized.roomId === 'string') {
    sanitized.roomId = sanitizeInput(sanitized.roomId);
  }
  
  if (sanitized.receiverId && typeof sanitized.receiverId === 'string') {
    sanitized.receiverId = sanitizeInput(sanitized.receiverId);
  }
  
  if (sanitized.senderUsername && typeof sanitized.senderUsername === 'string') {
    sanitized.senderUsername = sanitizeInput(sanitized.senderUsername);
  }
  
  if (sanitized.message && typeof sanitized.message === 'string') {
    sanitized.message = sanitizeInput(sanitized.message);
  }
  
  // Coordinates don't need sanitization as they're numbers
  // but we should make sure they are numbers
  if (sanitized.y !== undefined) {
    sanitized.y = Number(sanitized.y);
  }
  
  if (sanitized.x !== undefined) {
    sanitized.x = Number(sanitized.x);
  }
  
  return sanitized;
}

/**
 * Validates game input data to prevent SQL injection
 * @param {Object} data - The input data object
 * @returns {Object} - Validation result {isValid: boolean, message: string}
 */
export function validateGameInput(data) {
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
  
  // Validate roomId if present
  if (data.roomId && typeof data.roomId === 'string') {
    // Room IDs should be UUIDs or match a specific pattern
    if (!/^[a-zA-Z0-9-]+$/.test(data.roomId)) {
      return { 
        isValid: false, 
        message: 'Invalid room ID format' 
      };
    }
  }
  
  // Validate coordinates
  if (data.y !== undefined && (isNaN(Number(data.y)) || !isFinite(data.y))) {
    return { 
      isValid: false, 
      message: 'Invalid y coordinate' 
    };
  }
  
  if (data.x !== undefined && (isNaN(Number(data.x)) || !isFinite(data.x))) {
    return { 
      isValid: false, 
      message: 'Invalid x coordinate' 
    };
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
