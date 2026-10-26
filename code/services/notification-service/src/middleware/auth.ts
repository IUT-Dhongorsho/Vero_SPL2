import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

export interface AuthedRequest extends Request {
  userId?: string;
}

interface CacheEntry {
  userId: string;
  expiresAt: number;
}

/**
 * notification-service keeps no session replica, so identity is resolved by
 * asking auth-service — the same approach board-service uses. Results are
 * cached briefly because the bell polls and every socket reconnect verifies.
 */
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

export async function verifyCredentials(credentials: { authorization?: string; cookie?: string }): Promise<string | null> {
  const key = credentials.authorization ? `bearer:${credentials.authorization}` : credentials.cookie ? `cookie:${credentials.cookie}` : null;
  if (!key) return null;

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.userId;

  try {
    const response = await fetch(`${env.AUTH_SERVICE_URL}/internal/verify`, {
      headers: {
        ...(credentials.authorization ? { authorization: credentials.authorization } : {}),
        ...(credentials.cookie ? { cookie: credentials.cookie } : {}),
      },
    });
    if (!response.ok) return null;

    const session = (await response.json()) as { user?: { id?: string } };
    const userId = session?.user?.id;
    if (!userId) return null;

    if (cache.size > 5_000) cache.clear();
    cache.set(key, { userId, expiresAt: Date.now() + CACHE_TTL_MS });
    return userId;
  } catch (error: any) {
    console.error('[notification-service:auth] verify call failed:', error.message);
    return null;
  }
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const userId = await verifyCredentials({
    authorization: req.headers.authorization,
    cookie: req.headers.cookie,
  });
  if (!userId) return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  req.userId = userId;
  next();
}
