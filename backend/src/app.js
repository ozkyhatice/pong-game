import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySensible from '@fastify/sensible';
import fastifyJWT from '@fastify/jwt';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import { initDB } from './config/db.js';
import authRoutes from './modules/auth/routes/auth.routes.js';
import twoFARoutes from './modules/2fa/routes/2fa.routes.js';
import friendRoutes from './modules/friend/routes/friend.routes.js';
import userRoutes from './modules/user/routes/user.routes.js';
import chatRoutes from './modules/chat/routes/chat.routes.js';
import { websocketHandler } from './websocket/websocket.handler.js';
import path from 'path';

dotenv.config();

const app = fastify({ logger: true });

// Plugins
await app.register(fastifyCors, { 
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
});
await app.register(fastifySensible);
await app.register(fastifyJWT, { secret: process.env.JWT_SECRET || 'default_secret' });
await app.register(websocket);
await app.register(multipart);

// Database
await app.register(initDB);

// Static files - avatar resimleri için
await app.register(fastifyStatic, {
  root: path.join(process.cwd(), 'uploads'),
  prefix: '/uploads/',
});

// Routes
await app.register(authRoutes, { prefix: '/auth' });
await app.register(twoFARoutes, { prefix: '/2fa' });
await app.register(friendRoutes, { prefix: '/friends' });
await app.register(userRoutes, { prefix: '/users' });
await app.register(chatRoutes, { prefix: '/chat' });
app.get('/ws', { websocket: true }, websocketHandler);


export default app;