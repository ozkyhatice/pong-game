import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySensible from '@fastify/sensible';
import fastifyJWT from '@fastify/jwt';
import dotenv from 'dotenv';
import { initDB } from './config/db.js';
import authRoutes from './modules/auth/routes/auth.routes.js';

import friendRoute from './modules/friend/routes/friend.routes.js';
import userRoutes from './modules/user/routes/user.routes.js';

dotenv.config();

const app = fastify({ logger: true });

await app.register(fastifyCors, { origin: true });
await app.register(fastifySensible);
await app.register(fastifyJWT, { secret: process.env.JWT_SECRET || 'default_secret' });

await app.register(initDB);
await app.register(authRoutes, { prefix: '/auth' });

await app.register(friendRoute, { prefix: '/friends' });
await app.register(userRoutes, { prefix: '/users' });

export default app;