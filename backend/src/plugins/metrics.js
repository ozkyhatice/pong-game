import promClient from 'prom-client';

// Default metrics'leri topla (CPU, Memory, etc.)
promClient.collectDefaultMetrics({
  timeout: 5000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  prefix: 'pong_game_'
});

// Aktif bağlantılar için bir Gauge metriği oluştur
const activeConnections = new promClient.Gauge({
  name: 'pong_game_active_connections',
  help: 'Number of active WebSocket connections'
});

// HTTP Request Duration Histogram
const httpRequestDuration = new promClient.Histogram({
  name: 'pong_game_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

// HTTP Request Counter
const httpRequestTotal = new promClient.Counter({
  name: 'pong_game_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Export metrics globally for use in WebSocket handlers
export const metrics = {
  httpRequestDuration,
  httpRequestTotal,
  activeConnections
};

export default async function metricsPlugin(fastify, options) {

  fastify.get('/api/metrics', async (request, reply) => {
    reply.type('text/plain');
    return promClient.register.metrics();
  });

  fastify.decorate('metrics', metrics);
}
