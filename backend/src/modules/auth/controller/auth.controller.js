import { registerUser, loginUser } from '../service/auth.service.js';

export async function registerController(request, reply) {
  const { username, email, password } = request.body;

  try {
    const user = await registerUser({ username, email, password });

    const token = await reply.jwtSign({
      id: user.id,
      email: user.email
    });

    reply.code(201).send({ token, user });
  } catch (err) {
    reply.code(400).send({ error: err.message });
  }
}

export async function loginController(request, reply) {
  const { email, password } = request.body;

  try {
    const user = await loginUser({ email, password });

    const token = await reply.jwtSign({
      id: user.id,
      email: user.email
    });

    reply.send({ token, user });
  } catch (err) {
    reply.code(401).send({ error: err.message });
  }
}
