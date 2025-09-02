import { sanitizeInput, escapeHTML } from '../../utils/security.js';
import { containsSqlInjection, objectContainsSqlInjection } from './validation.js';

/**
 * WebSocket mesajlarını XSS ve SQL Injection saldırılarına karşı korur
 * @param {string} messageStr - JSON stringi olarak mesaj
 * @returns {object} - Temizlenmiş mesaj objesi veya hata
 */
export function sanitizeWebSocketMessage(messageStr) {
  try {
    // İlk olarak JSON parse et
    const message = JSON.parse(messageStr);
    
    // SQL Injection kontrolü
    if (objectContainsSqlInjection(message)) {
      throw new Error('Potential SQL injection detected');
    }
    
    // Recursive olarak tüm string değerleri temizle
    return sanitizeObjectRecursively(message);
  } catch (error) {
    if (error.message === 'Potential SQL injection detected') {
      throw error;
    }
    throw new Error('Invalid message format');
  }
}

/**
 * Bir objenin tüm string değerlerini recursive olarak temizler
 * @param {object|array|primitive} obj - Temizlenecek obje veya değer
 * @returns {object|array|primitive} - Temizlenmiş obje veya değer
 */
function sanitizeObjectRecursively(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // String ise temizle
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  // Array ise her elementi recursive olarak temizle
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectRecursively(item));
  }
  
  // Object ise her property'yi recursive olarak temizle
  if (typeof obj === 'object') {
    const sanitizedObj = {};
    for (const [key, value] of Object.entries(obj)) {
      // Anahtar isimlerini de kontrol et (güvenlik için)
      const sanitizedKey = typeof key === 'string' ? sanitizeInput(key) : key;
      sanitizedObj[sanitizedKey] = sanitizeObjectRecursively(value);
    }
    return sanitizedObj;
  }
  
  // Diğer primitive değerler için (number, boolean, etc.)
  return obj;
}

/**
 * WebSocket mesajlarını güvenli bir şekilde objeye dönüştürür
 * @param {WebSocket.Data} message - Gelen WebSocket mesajı
 * @returns {object} - Temizlenmiş ve parse edilmiş mesaj objesi
 * @throws {Error} - Geçersiz mesaj veya güvenlik ihlali durumunda
 */
export function parseWebSocketMessage(message) {
  const msgStr = message.toString();
  return sanitizeWebSocketMessage(msgStr);
}
