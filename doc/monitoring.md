# Monitoring: Prometheus and Grafana

Every Vero service reports numbers about itself on `GET /metrics`. Prometheus
reads those numbers every 15 seconds and keeps them. Grafana draws them as the
**Vero overview** dashboard.

```
 services (/metrics) ──scrape every 15 s──▶ Prometheus :9090 ──query──▶ Grafana :3001
 auth 8001/8011  board 8002/8012  notes 8003/8013  project 8004/8014
 chat 8005/8015  notification 8006/8016  meet 8007/8017  ai-worker 8008
```

## Start it

### With `dev-stack.sh` (services on your machine)

1. Start Docker Desktop.
2. Start the services as usual: `./scripts/dev-stack.sh --no-tunnel`
3. Start monitoring: `./scripts/dev-stack.sh monitoring`
4. Open Grafana at <http://localhost:3001>. The dashboard opens first. You can
   view it without signing in. To edit it, sign in as `admin` / `admin`.

To stop monitoring: `./scripts/dev-stack.sh monitoring down`. The collected
data stays in Docker volumes, so the graphs keep their history next time.

Prometheus runs in Docker and reaches your services at `host.docker.internal`
(see `code/infra/prometheus/prometheus.dev.yml`).

### With the full Docker stack

```
docker compose -f infra/docker/docker-compose.yml --profile monitoring up --build
```

Set `GRAFANA_ADMIN_PASSWORD` in `infra/docker/.env` first. This setup uses
`code/infra/prometheus/prometheus.yml`, which reaches each service by its
container name.

## Check that it works

Open <http://localhost:9090/targets>. Every service must show **UP**. If a
service shows **DOWN**:

- Make sure the service is running: `./scripts/dev-stack.sh status`
- Open its metrics yourself: `curl localhost:8002/metrics`
- Meet shows DOWN when meet-service is not running. That is expected.

## The dashboard

Each service has one colour, and it keeps that colour on every panel. For
example, chat is always lilac. Red only ever means a failure.

The **Service** menu at the top filters the request panels to one or more
services.

| Section | What it answers |
|---|---|
| Health | Is every copy of every service up? The timeline has one row per instance (primary and replica). The six numbers give the current load, error share, p95 latency and live usage. |
| Traffic | How busy is each service? What share of responses are 2xx, 3xx, 4xx and 5xx? |
| Latency | How fast are requests (p50, p95, p99)? Which service is slow? Which routes are slowest? |
| Errors | Which service returns 5xx, and on which route? |
| Live features | Open chat sockets and messages per minute, notes open for editing, meetings and participants, notifications sent by channel. |
| AI worker | Note digests per minute (ok, rejected, crashed) and how long they take. |
| Node.js runtime | Memory, CPU and event-loop delay for each service. |

Hover over the **i** next to a panel title to see how to read that panel.

### How to read percentiles

- **p50**: half of the requests are faster than this. This is a typical request.
- **p95**: 95 of every 100 requests are faster than this. This is a slow request.
- **p99**: the slowest 1 in 100 requests.

When p99 is much higher than p50, a small number of users get a much slower app.

## Alerts

Prometheus checks the rules in `code/infra/prometheus/alerts.yml`. Open
<http://localhost:9090/alerts> to see which rules are firing. Prometheus does
not send these alerts anywhere, because there is no Alertmanager.

| Alert | Fires when |
|---|---|
| ServiceDown | An instance does not answer `/metrics` for 1 minute. |
| HighServerErrorRate | More than 5% of a service's requests return 5xx for 5 minutes. |
| SlowRequests | A service's p95 latency stays above 1 s for 10 minutes. |
| AiJobsCrashing | More than 3 AI jobs crash in 15 minutes. |

## What each service measures

All services record these:

| Metric | Type | Meaning |
|---|---|---|
| `http_request_duration_seconds` | histogram | How long each request takes. Labels: `method`, `route`, `code`. |
| `process_*`, `nodejs_*` | various | Memory, CPU, event loop and garbage collection (prom-client defaults). |

The `route` label is the route **as written in the code**, for example
`/api/board/tasks/:projectId`. It is not the URL that was called. If every task
ID became its own label, Prometheus would store thousands of separate series.
A request that matches no route is labelled `unmatched`. Requests to `/metrics`
are not counted.

Some services also record numbers that are specific to them:

| Metric | Service | Meaning |
|---|---|---|
| `chat_active_sockets` | chat | Socket.io connections open now |
| `socket_connections_total` | chat | Connections opened since start |
| `messages_sent_total` | chat | Messages sent since start |
| `notes_live_editors` | notes | Open Yjs collaboration sockets |
| `meet_active_meetings_total` | meet | Rooms in memory |
| `meet_active_participants_total` | meet | Peers connected to rooms |
| `meet_sfu_workers_total` | meet | Live mediasoup worker processes |
| `notifications_delivered_total` | notification | Deliveries. Labels: `channel` (socket, email, push) and `result` (sent, failed, gone) |
| `ai_jobs_total` | ai-worker | Finished jobs. Labels: `job` and `outcome` (ok, rejected, error) |
| `ai_job_duration_seconds` | ai-worker | Time to finish a job |

## Add a metric

1. Define the metric in the service's `src/monitoring/metrics.ts`, using the
   same registry as the other metrics in that file.
2. Update it where the event happens. Call `.inc()` for a counter, or `.set()`
   / `.inc()` / `.dec()` for a gauge.
3. Do not put user IDs, note IDs or other unbounded values in labels.
4. Add a panel. Sign in to Grafana as admin, change the dashboard, then use
   **Export → Export as JSON** and save it over
   `code/infra/grafana/dashboards/vero-overview.json`. Restart Grafana to load
   the file:
   `docker compose -f infra/docker/monitoring.dev.yml restart grafana`

## Security

`/metrics` has no authentication. The gateway (`infra/nginx/vero-routes.conf`)
returns 404 for `/api/*/metrics`, so the numbers are not exposed through the
public zrok URL. Prometheus reads each service directly on its own port.

## Files

| File | Purpose |
|---|---|
| `code/services/*/src/monitoring/metrics.ts` | The metrics each service defines |
| `code/services/*/src/middleware/monitor.middleware.ts` | Times every HTTP request |
| `code/ai-worker/src/services/metrics.service.ts` | AI worker metrics and its `/metrics` server on port 8008 |
| `code/infra/prometheus/prometheus.yml` | What Prometheus scrapes in the Docker stack |
| `code/infra/prometheus/prometheus.dev.yml` | What Prometheus scrapes with `dev-stack.sh` |
| `code/infra/prometheus/alerts.yml` | Alert rules |
| `code/infra/grafana/provisioning/` | Connects Grafana to Prometheus and loads the dashboard |
| `code/infra/grafana/dashboards/vero-overview.json` | The dashboard |
| `code/infra/docker/monitoring.dev.yml` | Prometheus and Grafana for `dev-stack.sh` |
