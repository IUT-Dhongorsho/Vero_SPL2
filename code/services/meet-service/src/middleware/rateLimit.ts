import { Request, Response, NextFunction } from 'express';

const requests = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const now = Date.now();

  const entry = requests.get(ip);

  if (!entry || now > entry.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({
      error: 'Too many requests',
      retryAfterMs: entry.resetAt - now,
    });
    return;
  }

  next();
}
