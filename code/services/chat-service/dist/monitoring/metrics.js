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
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10]
});
export const socketConnectionsTotal = new client.Counter({
    name: 'socket_connections_total',
    help: 'Total number of socket connections'
});
export const messagesSentTotal = new client.Counter({
    name: 'messages_sent_total',
    help: 'Total number of messages sent'
});
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(socketConnectionsTotal);
register.registerMetric(messagesSentTotal);
