
export async function addSecurityHeaders(request, reply) {
  
  reply.header('X-XSS-Protection', '1; mode=block');
  
  
  reply.header('X-Frame-Options', 'DENY');
  
  
  reply.header('X-Content-Type-Options', 'nosniff');
  
  
  reply.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; object-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline';"
  );
  
  
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  
}
