  Key Implementation Details:
   * Metric Library: Installed prom-client in all services.
   * Standardized Setup: Each service now has a src/monitoring/metrics.ts file that initializes a registry and collects default Node.js
     metrics (CPU, Memory, Event Loop, etc.).
   * HTTP Tracking: Implemented a metricsMiddleware in each service that automatically tracks:
       * http_request_duration_seconds: Histogram of request latencies labeled by method, route, and statusCode.
   * Prometheus Ready: The /metrics endpoints are exposed in plain text format, ready for Prometheus to scrape.

  How to use with Prometheus:
  You can now configure your prometheus.yml to scrape these targets:

   1 scrape_configs:
   2   - job_name: 'vero-auth'
   3     static_configs: [{ targets: ['localhost:8001'] }]
   4   - job_name: 'vero-chat'
   5     static_configs: [{ targets: ['localhost:8005'] }]
   6   - job_name: 'vero-notes'
   7     static_configs: [{ targets: ['localhost:8003'] }]
   8   - job_name: 'vero-project'
   9     static_configs: [{ targets: ['localhost:8004'] }]
