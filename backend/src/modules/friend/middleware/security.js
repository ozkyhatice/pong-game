
export async function addSecurityHeaders(request, reply) {
  // Prevent XSS attacks
  reply.header('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking attacks
  reply.header('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  reply.header('X-Content-Type-Options', 'nosniff');
  
  // Set Content Security Policy to restrict content sources
  reply.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; object-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline';"
  );
  
  // Additional security headers
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // No done() callback needed with async functions
}
