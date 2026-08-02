import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

export interface AuthedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

interface CacheEntry {
  userId: string;
  email?: string;
  expiresAt: number;
}

/**
 * board-service has no session replica of its own, so identity is resolved by
 * asking auth-service. Results are cached briefly to keep the board responsive
 * during drag-and-drop bursts.
 */
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

function cacheKey(req: Request): string | null {
  const header = req.headers.authorization;
  if (header) return `bearer:${header}`;
  const cookie = req.headers.cookie;
  if (cookie) return `cookie:${cookie}`;
  return null;
}

export async function resolveUser(req: AuthedRequest): Promise<string | null> {
  const key = cacheKey(req);
  if (!key) return null;

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    req.userId = cached.userId;
    req.userEmail = cached.email;
    return cached.userId;
  }

  try {
    const response = await fetch(`${env.AUTH_SERVICE_URL}/internal/verify`, {
      headers: {
        ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
        ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
      },
    });

    if (!response.ok) return null;

    const session = (await response.json()) as { user?: { id: string; email?: string } };
    const userId = session?.user?.id;
    if (!userId) return null;

    cache.set(key, { userId, email: session.user?.email, expiresAt: Date.now() + CACHE_TTL_MS });
    req.userId = userId;
    req.userEmail = session.user?.email;
    return userId;
  } catch (error) {
    console.error('[board-service:auth] verify call failed', error);
    return null;
  }
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const userId = await resolveUser(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
