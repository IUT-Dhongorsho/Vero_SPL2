import client from 'prom-client';

export const register = new client.Registry();

register.setDefaultLabels({ app: 'meet-service' });
client.collectDefaultMetrics({ register });

export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  // Most API calls finish well under 100 ms; AI summaries can take far longer.
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [register],
});

export const activeMeetingsGauge = new client.Gauge({
  name: 'meet_active_meetings_total',
  help: 'Number of active mediasoup rooms in memory',
  registers: [register],
});

export const activeParticipantsGauge = new client.Gauge({
  name: 'meet_active_participants_total',
  help: 'Total active peer connections across all rooms',
  registers: [register],
});

export const sfuWorkersGauge = new client.Gauge({
  name: 'meet_sfu_workers_total',
  help: 'Number of live mediasoup Worker processes',
  registers: [register],
});
