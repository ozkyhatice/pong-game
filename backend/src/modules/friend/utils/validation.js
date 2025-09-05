
import { sanitizeGeneralInput, containsSqlInjection } from '../../../utils/validation.js';


export function validateUserId(userId) {
  
  if (typeof userId !== 'string' && typeof userId !== 'number') {
    return { isValid: false, message: 'Invalid user ID format' };
  }
  
  
  const userIdStr = String(userId);
  
  
  if (!/^\d+$/.test(userIdStr)) {
    return { isValid: false, message: 'User ID must be a positive integer' };
  }
  
  
  if (containsSqlInjection(userIdStr)) {
    return { isValid: false, message: 'Invalid input detected' };
  }
  
  
  const cleanId = parseInt(userIdStr, 10);
  
  
  if (cleanId <= 0 || cleanId > Number.MAX_SAFE_INTEGER) {
    return { isValid: false, message: 'User ID out of valid range' };
  }
  
  return { isValid: true, sanitizedValue: cleanId };
}


export function sanitizeFriendData(data) {
  const sanitizedData = { ...data };
  
  
  Object.keys(sanitizedData).forEach(key => {
    if (typeof sanitizedData[key] === 'string') {
      sanitizedData[key] = sanitizeGeneralInput(sanitizedData[key]);
    }
  });
  
  return sanitizedData;
}
