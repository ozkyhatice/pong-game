import { verifyToken } from "../../../middleware/auth.js";
import { handle2FASetup, handle2FADisable } from "../controller/2fa.controller.js";
import { setup2FASchema, disable2FASchema } from "../schema.js";

export default async function twoFARoutes(app, options) {
  app.get('/setup', { 
    preHandler: verifyToken,
    schema: setup2FASchema 
  }, handle2FASetup);

  app.patch('/disable', { 
    preHandler: verifyToken,
    schema: disable2FASchema 
  }, handle2FADisable);

}
