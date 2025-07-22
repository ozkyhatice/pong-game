import { registerController, loginController } from '../controller/auth.controller.js';
import { registerSchema, loginSchema } from '../schema.js';

export default async function authRoutes(app, options) {

  app.post('/register', {
    schema: registerSchema
  }, registerController);

  app.post('/login', {
    schema: loginSchema
  }, loginController);

}