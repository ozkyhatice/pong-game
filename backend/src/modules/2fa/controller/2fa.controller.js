import {
  generate2FASecret,
  disable2FA,
  verify2FACode,
} from "../service/2fa.service.js";
import { initDB } from "../../../config/db.js";
import { sanitizeInput } from "../../../utils/security.js";
import { containsSqlInjection, sanitizeGeneralInput } from '../../../utils/validation.js';



export async function handle2FASetup(request, reply) {
  try {
    const userId = request.user.id;
    const { qr, secret } = await generate2FASecret(userId);
    reply.send({ qr, secret });
  } catch (error) {
    reply.status(400).send({ error: error.message });
  }
}



export async function handle2FADisable(request, reply) {
  try {
    const userId = request.user.id;
    const result = await disable2FA(userId);
    reply.send(result);
  } catch (error) {
    reply.status(400).send({ error: error.message });
  }
}





export async function handle2FAVerify(request, reply) {
  try {
    const userId = request.user.id;
    const { token } = request.body;

    
    if (!token || typeof token !== 'string') {
      return reply.status(400).send({ error: "2FA token is required" });
    }

    
    if (!/^\d{6}$/.test(token)) {
      return reply.status(400).send({ error: "2FA token must be 6 digits" });
    }

    
    if (containsSqlInjection(token)) {
      return reply.status(400).send({ error: "Invalid characters detected in token" });
    }

    
    const sanitizedToken = sanitizeGeneralInput(token, { maxLength: 6 });

    const isValid = await verify2FACode(userId, sanitizedToken);
    if (!isValid) {
      return reply.status(400).send({ error: "Invalid 2FA token." });
    }
    return reply.send({
      success: true,
      message: "2FA token verified successfully.",
    });
  } catch (error) {
    return reply.status(400).send({ error: error.message });
  }
}





export async function handle2FALoginVerify(request, reply) {
  try {
    const { userId, token } = request.body;

    
    const sanitizedToken = sanitizeInput(token);

    const isValid = await verify2FACode(userId, sanitizedToken);
    if (!isValid) {
      return reply.status(400).send({ error: "Invalid 2FA token." });
    }

    const db = await initDB();
    const user = await db.get('SELECT id, email, username FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return reply.status(404).send({ error: "User not found." });
    }

    
    const jwtToken = await reply.jwtSign({
      id: user.id,
      email: user.email,
      username: user.username
    }, { expiresIn: '7d' });

    return reply.send({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      message: "2FA verified and login successful."
    });
  } catch (error) {
    return reply.status(400).send({ error: error.message });
  }
}
