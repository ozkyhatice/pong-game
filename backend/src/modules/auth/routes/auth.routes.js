import { register, login, me } from '../controller/auth.controller.js';
import { registerSchema, loginSchema, meSchema } from '../schema.js';
import { verifyToken } from '../../../middleware/auth.js';

export default async function authRoutes(app, options) {
  app.post('/register', {
    schema: registerSchema
  }, register);

  app.post('/login', {
    schema: loginSchema
  }, login);

  app.get('/me', {
    preHandler: verifyToken,
    schema: meSchema
  }, me);
}