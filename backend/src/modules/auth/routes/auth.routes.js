import { register, login, googleCallbackHandler, me } from '../controller/auth.controller.js';
import { registerSchema, loginSchema, meSchema } from '../schema.js';
import { verifyToken } from '../../../middleware/auth.js';
import fastifyOauth2 from '@fastify/oauth2';

export default async function authRoutes(app, options) {
  
  // user registration route
  app.post('/register', {
    schema: registerSchema
  }, register);

  // user login route
  app.post('/login', {
    schema: loginSchema
  }, login);

  app.get('/me', {
    preHandler: verifyToken,
    schema: meSchema
  }, me);

  // Google OAuth2 entegration - if enabled via env vars
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (googleClientId && googleClientSecret) {
    
    try {
      await app.register(fastifyOauth2, {
        name: 'googleOAuth2',
        scope: ['profile', 'email'],
        credentials: {
          client: {
            id: googleClientId,
            secret: googleClientSecret
          },
          auth: fastifyOauth2.GOOGLE_CONFIGURATION
        },
        startRedirectPath: '/google',
        callbackUri: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/google/callback`
      });

      // Google OAuth callback route
      app.get('/google/callback', googleCallbackHandler);
      
    } catch (error) {
      console.log('Google OAuth setup failed:', error.message);
    }
  }
}