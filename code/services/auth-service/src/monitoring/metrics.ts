import client from 'prom-client';

export const register = new client.Registry();

register.setDefaultLabels({
  app: 'auth-service'
});

client.collectDefaultMetrics({ register });

export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  // Most API calls finish well under 100 ms; AI summaries can take far longer.
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]
});

register.registerMetric(httpRequestDurationMicroseconds);
