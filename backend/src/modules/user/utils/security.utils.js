import { escapeHTML, sanitizeInput } from '../../../utils/security.js';
import { containsSqlInjection, isValidUsername, isValidEmail } from '../../../utils/validation.js';

export function sanitizeUserInput(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sanitized = { ...data };
  
  
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

export function validateUserInput(data) {
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
  
  
  if (data.username !== undefined) {
    if (!isValidUsername(data.username)) {
      return { 
        isValid: false, 
        message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores' 
      };
    }
  }
  
  
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

export function sanitizeUserProfile(user) {
  if (!user || typeof user !== 'object') {
    return user;
  }
  
  
  const sanitizedUser = { ...user };
  
  
  if (sanitizedUser.username) {
    sanitizedUser.username = escapeHTML(sanitizedUser.username);
  }
  
  if (sanitizedUser.email) {
    sanitizedUser.email = escapeHTML(sanitizedUser.email);
  }
  
  if (sanitizedUser.avatar) {
    sanitizedUser.avatar = escapeHTML(sanitizedUser.avatar);
  }
  
  
  delete sanitizedUser.password;
  delete sanitizedUser.twoFASecret;
  
  return sanitizedUser;
}
