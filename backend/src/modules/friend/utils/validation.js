
import { sanitizeGeneralInput, containsSqlInjection } from '../../../utils/validation.js';


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

// Sanitizes and validates friend-related data
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
