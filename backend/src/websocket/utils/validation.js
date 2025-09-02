/**
 * WebSocket mesajlarında güvenlik kontrolü için validasyon fonksiyonları
 */

import { containsSqlInjection as mainContainsSqlInjection } from '../../utils/validation.js';

/**
 * Girilen string'in potansiyel SQL injection içerip içermediğini kontrol eder
 * @param {string} input - Kontrol edilecek input
 * @returns {boolean} - Şüpheli SQL pattern var mı?
 */
export function containsSqlInjection(input) {
  return mainContainsSqlInjection(input);
}

/**
 * Bir objenin tüm string değerlerini SQL injection açısından kontrol eder
 * @param {object|array|primitive} obj - Kontrol edilecek obje veya değer
 * @returns {boolean} - Şüpheli SQL pattern var mı?
 */
export function objectContainsSqlInjection(obj) {
  if (obj === null || obj === undefined) {
    return false;
  }
  
  // String ise direkt kontrol et
  if (typeof obj === 'string') {
    return containsSqlInjection(obj);
  }
  
  // Array ise her elementi recursive olarak kontrol et
  if (Array.isArray(obj)) {
    return obj.some(item => objectContainsSqlInjection(item));
  }
  
  // Object ise her property'yi recursive olarak kontrol et
  if (typeof obj === 'object') {
    return Object.entries(obj).some(([key, value]) => {
      // Anahtar isimlerini de kontrol et
      return (typeof key === 'string' && containsSqlInjection(key)) || 
             objectContainsSqlInjection(value);
    });
  }
  
  // Diğer primitive değerler için (number, boolean, etc.)
  return false;
}
