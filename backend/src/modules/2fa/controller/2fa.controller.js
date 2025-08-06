import {
  generate2FASecret,
  disable2FA,
  verify2FACode,
} from "../service/2fa.service.js";

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

    const isValid = await verify2FACode(userId, token);
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

// Login sırasında 2FA doğrulaması için (JWT token döndürür)
export async function handle2FALoginVerify(request, reply) {
  try {
    const { userId, token } = request.body;

    const isValid = await verify2FACode(userId, token);
    if (!isValid) {
      return reply.status(400).send({ error: "Invalid 2FA token." });
    }

    // User bilgilerini al
    const db = request.server.db;
    const user = await db.get('SELECT id, email, username FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return reply.status(404).send({ error: "User not found." });
    }

    // JWT token oluştur
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
