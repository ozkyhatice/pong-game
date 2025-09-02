/**
 * Friend module validation and sanitization functions
 */

import { sanitizeGeneralInput, containsSqlInjection } from '../../../utils/validation.js';
import { escapeHTML } from '../../../utils/security.js';

/**
 * Validates and sanitizes user IDs for friend-related operations
 * @param {string|number} userId - The ID to validate
 * @returns {object} - Validation result with sanitized value if valid
 */
export function validateUserId(userId) {
  // If not a string or number, it's invalid
  if (typeof userId !== 'string' && typeof userId !== 'number') {
    return { isValid: false, message: 'Invalid user ID format' };
  }
  
  // Convert to string for validation
  const userIdStr = String(userId);
  
  // Check if it's a valid integer
  if (!/^\d+$/.test(userIdStr)) {
    return { isValid: false, message: 'User ID must be a positive integer' };
  }
  
  // Check for SQL injection
  if (containsSqlInjection(userIdStr)) {
    return { isValid: false, message: 'Invalid input detected' };
  }
  
  // Parse to integer
  const cleanId = parseInt(userIdStr, 10);
  
  // Additional bounds check if needed
  if (cleanId <= 0 || cleanId > Number.MAX_SAFE_INTEGER) {
    return { isValid: false, message: 'User ID out of valid range' };
  }
  
  return { isValid: true, sanitizedValue: cleanId };
}

/**
 * Sanitizes friend request data
 * @param {object} data - The friend request data
 * @returns {object} - Sanitized data
 */
export function sanitizeFriendData(data) {
  const sanitizedData = { ...data };
  
  // Sanitize all string properties
  Object.keys(sanitizedData).forEach(key => {
    if (typeof sanitizedData[key] === 'string') {
      sanitizedData[key] = sanitizeGeneralInput(sanitizedData[key]);
    }
  });
  
  return sanitizedData;
}
