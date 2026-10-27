import http from 'http';
import client from 'prom-client';
import { env } from '../config/env.js';

export const register = new client.Registry();

register.setDefaultLabels({ app: 'ai-worker' });
client.collectDefaultMetrics({ register });

/** `ok` succeeded, `rejected` is an expected failure (no key, bad input), `error` crashed and BullMQ retries it. */
export const aiJobsTotal = new client.Counter({
  name: 'ai_jobs_total',
  help: 'AI jobs finished, by job name and outcome',
  labelNames: ['job', 'outcome'],
  registers: [register],
});

// Start every series at 0 so dashboards show "none yet" rather than "no data".
for (const outcome of ['ok', 'rejected', 'error']) aiJobsTotal.inc({ job: 'note.digest', outcome }, 0);

export const aiJobDuration = new client.Histogram({
  name: 'ai_job_duration_seconds',
  help: 'Time from picking up an AI job to finishing it',
  labelNames: ['job'],
  buckets: [0.5, 1, 2.5, 5, 10, 20, 30, 60, 120],
  registers: [register],
});

/** The worker has no HTTP API, so it serves /metrics on a port of its own. */
export function startMetricsServer() {
  const server = http.createServer(async (req, res) => {
    if (req.url !== '/metrics') {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': register.contentType });
    res.end(await register.metrics());
  });
  server.on('error', (e) => console.error(`[ai-worker] metrics server failed on :${env.METRICS_PORT}:`, e.message));
  server.listen(env.METRICS_PORT);
  return server;
}
