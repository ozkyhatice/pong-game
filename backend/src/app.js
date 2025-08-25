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
import metricsPlugin, { metrics } from './plugins/metrics.js';
import path from 'path';

dotenv.config();

const app = fastify({ logger: true });

// Global metrics hook - tüm istekleri yakalar
app.addHook('onRequest', async (request, reply) => {
  request.startTime = Date.now();
});

app.addHook('onSend', async (request, reply, payload) => {
  const route = request.routeOptions?.url || request.url.split('?')[0];
  
  // /api/metrics endpoint'ini metrik toplamasından hariç tut
  if (route === '/api/metrics') {
    return payload;
  }

  const duration = (Date.now() - request.startTime) / 1000;
  const method = request.method;
  const statusCode = reply.statusCode.toString();

  // Request suresi
  metrics.httpRequestDuration
    .labels(method, route, statusCode)
    .observe(duration);

  // Request sayısı
  metrics.httpRequestTotal
    .labels(method, route, statusCode)
    .inc();

  return payload;
});

// cors 
await app.register(fastifyCors, { 
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
});

await app.register(fastifySensible);
await app.register(fastifyJWT, { secret: process.env.JWT_SECRET || 'default_secret' });
await app.register(websocket);
await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });
await app.register(initDB);
await app.register(metricsPlugin);


// Static files - avatar resimleri için
await app.register(fastifyStatic, {
  root: path.join(process.cwd(), 'uploads'),
  prefix: '/api/uploads/',
});

// main route
app.get('/', async (request, reply) => {
  reply.send({ message: 'Welcome to the Pong Game API!' });
});

await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(twoFARoutes, { prefix: '/api/2fa' });
await app.register(friendRoutes, { prefix: '/api/friends' });
await app.register(userRoutes, { prefix: '/api/users' });
await app.register(chatRoutes, { prefix: '/api/chat' });
app.get('/ws', { websocket: true }, websocketHandler);


export default app;