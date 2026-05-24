import client from 'prom-client';

export const register = new client.Registry();

register.setDefaultLabels({
  app: 'project-service'
});

client.collectDefaultMetrics({ register });

export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10]
});

register.registerMetric(httpRequestDurationMicroseconds);
