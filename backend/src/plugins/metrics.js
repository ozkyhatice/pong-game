import promClient from 'prom-client';

promClient.collectDefaultMetrics({
  timeout: 5000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  prefix: 'pong_game_'
});

const activeConnections = new promClient.Gauge({
  name: 'pong_game_active_connections',
  help: 'Number of active WebSocket connections'
});


const httpRequestDuration = new promClient.Histogram({
  name: 'pong_game_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});


const httpRequestTotal = new promClient.Counter({
  name: 'pong_game_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});


const totalGamesPlayed = new promClient.Gauge({
  name: 'pong_game_total_games_played',
  help: 'Total number of games played'
});


const userRegistrations = new promClient.Gauge({
  name: 'pong_game_user_registrations_total',
  help: 'Total number of registered users'
});

export const metrics = {
  httpRequestDuration,
  httpRequestTotal,
  activeConnections,
  totalGamesPlayed,
  userRegistrations
};

export default async function metricsPlugin(fastify, options) {
  try {
    const { initDB } = await import('../config/db.js');
    const db = await initDB();

    const userResult = await db.get('SELECT COUNT(*) as total FROM users');
    const totalUsers = userResult?.total || 0;
    userRegistrations.set(totalUsers);

    const gameResult = await db.get('SELECT COUNT(*) as total FROM matches');
    const totalGames = gameResult?.total || 0;
    totalGamesPlayed.set(totalGames);
    
  } catch (error) {
    userRegistrations.set(0);
    totalGamesPlayed.set(0);
  }

  fastify.get('/api/metrics', async (request, reply) => {
    reply.type('text/plain');
    return promClient.register.metrics();
  });

  fastify.decorate('metrics', metrics);
}
