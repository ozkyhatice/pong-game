import { sanitizeInput } from '../../utils/security.js';
import { objectContainsSqlInjection } from './validation.js';

export function sanitizeWebSocketMessage(messageStr) {
  try {
    const message = JSON.parse(messageStr);
    
    if (objectContainsSqlInjection(message)) {
      throw new Error('Potential SQL injection detected');
    }
    
    return sanitizeObjectRecursively(message);
  } catch (error) {
    if (error.message === 'Potential SQL injection detected') {
      throw error;
    }
    throw new Error('Invalid message format');
  }
}


function sanitizeObjectRecursively(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectRecursively(item));
  }
  
  if (typeof obj === 'object') {
    const sanitizedObj = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = typeof key === 'string' ? sanitizeInput(key) : key;
      sanitizedObj[sanitizedKey] = sanitizeObjectRecursively(value);
    }
    return sanitizedObj;
  }
  
  return obj;
}


export function parseWebSocketMessage(message) {
  const msgStr = message.toString();
  return sanitizeWebSocketMessage(msgStr);
}
