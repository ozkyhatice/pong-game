import { sanitizeInput } from '../../../utils/security.js';
import { containsSqlInjection } from '../../../utils/validation.js';


export function sanitizeGameInput(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sanitized = { ...data };
  
  
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
  
  
  
  if (sanitized.y !== undefined) {
    sanitized.y = Number(sanitized.y);
  }
  
  if (sanitized.x !== undefined) {
    sanitized.x = Number(sanitized.x);
  }
  
  return sanitized;
}


export function validateGameInput(data) {
  if (!data) {
    return { isValid: false, message: 'No data provided' };
  }
  
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && containsSqlInjection(value)) {
      return { 
        isValid: false, 
        message: `Suspicious input detected in ${key}` 
      };
    }
  }
  
  
  if (data.roomId && typeof data.roomId === 'string') {
    
    if (!/^[a-zA-Z0-9-]+$/.test(data.roomId)) {
      return { 
        isValid: false, 
        message: 'Invalid room ID format' 
      };
    }
  }
  
  
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


export function isValidUserId(userId) {
  
  return !isNaN(parseInt(userId)) && parseInt(userId).toString() === userId.toString();
}


export function prepareSqlParams(params) {
  if (!Array.isArray(params)) {
    return [];
  }
  
  return params.map(param => {
    if (typeof param === 'string') {
      
      return param.replace(/['";]/g, '');
    }
    return param;
  });
}
