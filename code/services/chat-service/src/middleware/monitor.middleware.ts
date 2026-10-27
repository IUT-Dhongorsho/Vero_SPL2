import { Request, Response, NextFunction } from 'express';
import { httpRequestDurationMicroseconds } from '../monitoring/metrics.js';

// Label requests by their route template (`/tasks/:id`), never the raw URL:
// every id would otherwise become its own time series in Prometheus.
const routeLabel = (req: Request) => {
  if (!req.route) return 'unmatched';
  const path = Array.isArray(req.route.path) ? req.route.path[0] : String(req.route.path);
  return `${req.baseUrl}${path === '/' && req.baseUrl ? '' : path}` || '/';
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Prometheus scraping itself is not traffic.
  if (req.path === '/metrics') return next();

  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: routeLabel(req), code: String(res.statusCode) });
  });

  next();
};
