import { generate2FASecret, disable2FA } from '../service/2fa.service.js';

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
