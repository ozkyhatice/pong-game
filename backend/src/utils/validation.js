import { escapeHTML } from './security.js';

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9_]{3,10}$/;
  return usernameRegex.test(username);
}

export function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  if (password.length < minLength) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!hasUpperCase) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!hasLowerCase) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!hasNumbers) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  

  
  return { isValid: true, message: 'Password is valid' };
}


export function containsSqlInjection(input) {
  if (typeof input !== 'string') {
    return false;
  }
  
  const sqlInjectionPatterns = [
    /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|UNION)(\s)/i,
    /(\s|^)(FROM|INTO|WHERE|GROUP BY|ORDER BY|HAVING)(\s)/i,
    /'(''|[^'])*';/i,
    /--/,
    /\/\*/,
    /;\s*$/,
    /UNION\s+ALL\s+SELECT/i,
    /OR\s+1=1/i,
    /OR\s+'1'='1'/i,
    /OR\s+a=a/i
  ];
  
  return sqlInjectionPatterns.some(pattern => pattern.test(input));
}


export function validateChatMessage(message) {
  if (!message || typeof message !== 'string') {
    return { isValid: false, message: 'Message is required' };
  }
  
  const trimmedMessage = message.trim();
  
  if (trimmedMessage.length === 0) {
    return { isValid: false, message: 'Message cannot be empty' };
  }
  
  if (trimmedMessage.length > 1000) {
    return { isValid: false, message: 'Message is too long (max 1000 characters)' };
  }
  
  const sanitizedMessage = escapeHTML(trimmedMessage);
  
  return { 
    isValid: true, 
    message: 'Message is valid',
    sanitizedMessage 
  };
}


export function validateTournamentName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, message: 'Tournament name is required' };
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length === 0) {
    return { isValid: false, message: 'Tournament name cannot be empty' };
  }
  
  if (trimmedName.length < 3) {
    return { isValid: false, message: 'Tournament name must be at least 3 characters' };
  }
  
  if (trimmedName.length > 50) {
    return { isValid: false, message: 'Tournament name is too long (max 50 characters)' };
  }
  
  const validNameRegex = /^[a-zA-Z0-9\s\-_!.]+$/;
  if (!validNameRegex.test(trimmedName)) {
    return { isValid: false, message: 'Tournament name contains invalid characters' };
  }
  
  const sanitizedName = escapeHTML(trimmedName);
  
  return { 
    isValid: true, 
    message: 'Tournament name is valid',
    sanitizedName 
  };
}


export function sanitizeGeneralInput(input, options = {}) {
  if (typeof input !== 'string') return input;
  
  let sanitized = input;
  
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }
  
  if (options.escapeHtml !== false) {
    sanitized = escapeHTML(sanitized);
  }
  
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  return sanitized;
}
