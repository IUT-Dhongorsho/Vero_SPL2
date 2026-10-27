import client from 'prom-client';

export const register = new client.Registry();

register.setDefaultLabels({ app: 'notification-service' });
client.collectDefaultMetrics({ register });

export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [register],
});

export const notificationsDeliveredTotal = new client.Counter({
  name: 'notifications_delivered_total',
  help: 'Notification deliveries by channel (socket, email, push) and result (sent, failed, gone)',
  labelNames: ['channel', 'result'],
  registers: [register],
});

// Start every series at 0 so dashboards show "none yet" rather than "no data".
for (const channel of ['socket', 'email', 'push']) {
  for (const result of ['sent', 'failed']) notificationsDeliveredTotal.inc({ channel, result }, 0);
}
