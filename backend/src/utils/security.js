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


export function escapeFields(obj, fields) {
  const escaped = { ...obj };
  
  fields.forEach(field => {
    if (escaped[field] && typeof escaped[field] === 'string') {
      escaped[field] = escapeHTML(escaped[field]);
    }
  });
  
  return escaped;
}


export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  let sanitized = escapeHTML(input);
  
  sanitized = sanitized.trim();
  
  return sanitized;
}
