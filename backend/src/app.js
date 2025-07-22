import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySensible from '@fastify/sensible';
import fastifyJWT from '@fastify/jwt';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/routes/auth.routes.js';

dotenv.config();

const app = fastify({ logger: true });

await app.register(fastifyCors, { origin: true });
await app.register(fastifySensible);
await app.register(fastifyJWT, { secret: process.env.JWT_SECRET || 'default_secret' });

await app.register(authRoutes, { prefix: '/auth' });

export default app;