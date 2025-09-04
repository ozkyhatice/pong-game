import { verifyToken } from "../../../middleware/auth.js";
import { handle2FASetup, handle2FADisable, handle2FAVerify, handle2FALoginVerify } from "../controller/2fa.controller.js";
import { setup2FASchema, disable2FASchema, verify2FASchema, verify2FALoginSchema } from "../schema.js";

export default async function twoFARoutes(app, options) {
  //  2FA ayarlama sayfasi için (QR kod ve secret döndürür)
  app.get('/setup', { 
    preHandler: verifyToken,
    schema: setup2FASchema 
  }, handle2FASetup);

  //  2FA devre dışı bırakma sayfasi için
  app.patch('/disable', { 
    preHandler: verifyToken,
    schema: disable2FASchema 
  }, handle2FADisable);

  //  2FA kod doğrulama sayfasi için (JWT token döndürmez)
  app.post('/verify', {
    preHandler: verifyToken,
    schema: verify2FASchema
  }, handle2FAVerify);

  //  2FA code sayfasi için (JWT token döndürür)
  app.post('/verify-login', {
    schema: verify2FALoginSchema
  }, handle2FALoginVerify);

}
