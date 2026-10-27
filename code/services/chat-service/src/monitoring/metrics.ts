import client from 'prom-client';

// Create a Registry which registers the metrics
export const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'chat-service'
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  // Most API calls finish well under 100 ms; AI summaries can take far longer.
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]
});

export const socketConnectionsTotal = new client.Counter({
  name: 'socket_connections_total',
  help: 'Total number of socket connections'
});

export const activeSockets = new client.Gauge({
  name: 'chat_active_sockets',
  help: 'Socket.io connections open right now'
});

export const messagesSentTotal = new client.Counter({
  name: 'messages_sent_total',
  help: 'Total number of messages sent'
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(socketConnectionsTotal);
register.registerMetric(messagesSentTotal);
register.registerMetric(activeSockets);
