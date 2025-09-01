/**
 * XSS koruması için HTML karakterlerini escape eder
 * @param {string} str - Escape edilecek string
 * @returns {string} - Escape edilmiş string
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') {
    return str;
  }
  
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Birden fazla string'i escape eder
 * @param {object} obj - Escape edilecek property'leri içeren object
 * @param {string[]} fields - Escape edilecek field'ların listesi
 * @returns {object} - Escape edilmiş object
 */
export function escapeFields(obj, fields) {
  const escaped = { ...obj };
  
  fields.forEach(field => {
    if (escaped[field] && typeof escaped[field] === 'string') {
      escaped[field] = escapeHTML(escaped[field]);
    }
  });
  
  return escaped;
}

/**
 * Kullanıcı input'larını sanitize eder
 * @param {string} input - Temizlenecek input
 * @returns {string} - Temizlenmiş input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // XSS koruması
  let sanitized = escapeHTML(input);
  
  // Fazla boşlukları temizle
  sanitized = sanitized.trim();
  
  return sanitized;
}
