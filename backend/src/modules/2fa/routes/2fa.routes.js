import { verifyToken } from "../../../middleware/auth.js";
import { handle2FASetup, handle2FADisable, handle2FAVerify, handle2FALoginVerify } from "../controller/2fa.controller.js";
import { setup2FASchema, disable2FASchema, verify2FASchema, verify2FALoginSchema } from "../schema.js";

export default async function twoFARoutes(app, options) {
  
  app.get('/setup', { 
    preHandler: verifyToken,
    schema: setup2FASchema 
  }, handle2FASetup);

  
  app.patch('/disable', { 
    preHandler: verifyToken,
    schema: disable2FASchema 
  }, handle2FADisable);

  
  app.post('/verify', {
    preHandler: verifyToken,
    schema: verify2FASchema
  }, handle2FAVerify);

  
  app.post('/verify-login', {
    schema: verify2FALoginSchema
  }, handle2FALoginVerify);

}
