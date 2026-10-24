import { Request, Response, NextFunction } from 'express';
import { and, eq, gt, or } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { sessions } from '../models/user.model.js';

export interface AuthRequest extends Request {
  userId?: string;
  /** The caller's own Authorization header, forwarded to project-service. */
  authorization?: string;
}

const cache = new Map<string, { userId: string; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

/**
 * Who owns this bearer token? Sessions are replicated here from auth-service,
 * so most lookups are local; a session minted moments ago may not have been
 * replicated yet, so auth-service is asked as a fallback. Nothing the client
 * merely asserts (headers, unsigned JWT payloads) is ever trusted.
 */
export async function userForToken(token: string): Promise<string | null> {
  if (!token) return null;
  const cached = cache.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.userId;

  let userId: string | null = null;
  try {
    const session = await db.query.sessions.findFirst({
      where: and(or(eq(sessions.authToken, token), eq(sessions.token, token)), gt(sessions.expiresAt, new Date())),
    });
    userId = session?.userId ?? null;
  } catch (error: any) {
    console.error('[notes:auth] session lookup failed:', error.message);
  }

  if (!userId) {
    try {
      const response = await fetch(`${env.AUTH_SERVICE_URL}/internal/verify`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const session = (await response.json()) as { user?: { id?: string } };
        userId = session?.user?.id ?? null;
      }
    } catch (error: any) {
      console.error('[notes:auth] auth-service verify failed:', error.message);
    }
  }

  if (userId) {
    if (cache.size > 5_000) cache.clear();
    cache.set(token, { userId, expiresAt: Date.now() + CACHE_TTL_MS });
  }
  return userId;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  const userId = await userForToken(authHeader.slice(7));
  if (!userId) return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });

  req.userId = userId;
  req.authorization = authHeader;
  next();
};

/** The Yjs socket carries the token as a query parameter (browsers cannot set headers). */
export const authenticateWs = async (req: any): Promise<{ userId: string; token: string }> => {
  const url = new URL(req.url || '', 'http://localhost');
  const token = url.searchParams.get('token') ?? '';
  const userId = await userForToken(token);
  if (!userId) throw new Error('Unauthorized WebSocket connection');
  return { userId, token };
};
