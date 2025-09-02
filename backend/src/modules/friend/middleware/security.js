/**
 * Security headers middleware for friend module
 * Sets various HTTP security headers to mitigate common web vulnerabilities
 */

/**
 * Add security headers to all friend module responses
 * @param {object} request - Fastify request object
 * @param {object} reply - Fastify reply object
 * @param {function} done - Callback to continue processing
 */
export async function addSecurityHeaders(request, reply, done) {
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
  
  done();
}
