import { sanitizeInput } from '../../../utils/security.js';
import { containsSqlInjection } from '../../../utils/validation.js';

// Sanitizes game-related input data to prevent XSS attacks
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

// Validates game-related input data to prevent injection attacks
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

// Checks if a user ID is valid (numeric and positive)
export function isValidUserId(userId) {
  // User IDs should be integers in this application
  return !isNaN(parseInt(userId)) && parseInt(userId).toString() === userId.toString();
}

// Prepares SQL parameters by sanitizing inputs to prevent SQL injection
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
