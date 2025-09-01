import { escapeHTML } from './security.js';

/**
 * Input validation ve sanitization için utility fonksiyonlar
 */

/**
 * Email formatını kontrol eder
 * @param {string} email - Kontrol edilecek email
 * @returns {boolean} - Email geçerli mi?
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Username'in geçerli olup olmadığını kontrol eder
 * @param {string} username - Kontrol edilecek username
 * @returns {boolean} - Username geçerli mi?
 */
export function isValidUsername(username) {
  // 3-20 karakter, sadece harf, rakam ve underscore
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

/**
 * Password'un güvenli olup olmadığını kontrol eder
 * @param {string} password - Kontrol edilecek password
 * @returns {object} - Validation sonucu ve mesajı
 */
export function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
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
  
  // İsteğe bağlı: özel karakter kontrolü
  // if (!hasSpecialChar) {
  //   return { isValid: false, message: 'Password must contain at least one special character' };
  // }
  
  return { isValid: true, message: 'Password is valid' };
}

/**
 * Girilen string'in potansiyel SQL injection içerip içermediğini kontrol eder
 * @param {string} input - Kontrol edilecek input
 * @returns {boolean} - Şüpheli SQL pattern var mı?
 */
export function containsSqlInjection(input) {
  if (typeof input !== 'string') return false;
  
  const sqlPatterns = [
    /('|(\\')|(;\s*(drop|delete|insert|update|select|union|exec|execute)))/i,
    /(union\s+select)/i,
    /(select\s+.*\s+from)/i,
    /(insert\s+into)/i,
    /(delete\s+from)/i,
    /(update\s+.*\s+set)/i,
    /(drop\s+table)/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Chat mesajı için validation
 * @param {string} message - Kontrol edilecek mesaj
 * @returns {object} - Validation sonucu
 */
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
  
  // XSS koruması
  const sanitizedMessage = escapeHTML(trimmedMessage);
  
  return { 
    isValid: true, 
    message: 'Message is valid',
    sanitizedMessage 
  };
}

/**
 * Tournament adı için validation
 * @param {string} name - Kontrol edilecek tournament adı
 * @returns {object} - Validation sonucu
 */
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
  
  // Sadece harf, rakam, boşluk ve bazı özel karakterlere izin ver
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

/**
 * Genel input sanitization
 * @param {string} input - Sanitize edilecek input
 * @param {object} options - Sanitization seçenekleri
 * @returns {string} - Sanitize edilmiş input
 */
export function sanitizeGeneralInput(input, options = {}) {
  if (typeof input !== 'string') return input;
  
  let sanitized = input;
  
  // Trim whitespace
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }
  
  // XSS koruması
  if (options.escapeHtml !== false) {
    sanitized = escapeHTML(sanitized);
  }
  
  // Maximum length kontrolü
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  return sanitized;
}
