import { registerController, loginController, meController } from '../controller/auth.controller.js';
import { registerSchema, loginSchema, meSchema } from '../schema.js';
import { verifyToken } from '../../../middleware/auth.js';

export default async function authRoutes(app, options) {

  app.post('/register', {
    schema: registerSchema
  }, registerController);

  app.post('/login', {
    schema: loginSchema
  }, loginController);

  app.get('/me', {
    preHandler: verifyToken,
    schema: meSchema
  }, meController);

}