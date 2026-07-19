import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export interface AuthRequest extends Request {
  userId?: string;
}

const isDev = process.env.NODE_ENV !== 'production';
const AUTH_URL = 'http://127.0.0.1:8001/internal/verify';

function tryExtractUserId(token: string): string | null {
  if (!token) return null;
  try {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const parts = cleanToken.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      if (payload && (payload.id || payload.userId || payload.sub)) {
        return payload.id || payload.userId || payload.sub;
      }
    }
  } catch (_) {}
  return null;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  // 1. In development, accept X-User-Id header if provided
  if (isDev) {
    const userId = req.headers['x-user-id'] as string;
    if (userId) {
      req.userId = userId;
      return next();
    }
    const token = authHeader.split(' ')[1];
    if (token.startsWith('fake-jwt-token-')) {
      req.userId = 'dev-user';
      return next();
    }
  }

  // 2. Try extracting user ID directly from JWT payload
  const token = authHeader.split(' ')[1];
  const extractedUserId = tryExtractUserId(token);
  if (extractedUserId) {
    req.userId = extractedUserId;
    return next();
  }

  // 3. Fallback: verify via auth-service internal API
  try {
    const response = await fetch(AUTH_URL, {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const session = await response.json();
    req.userId = session.user.id;
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

export const authenticateWs = async (req: any): Promise<{ userId: string }> => {
  const url = new URL(req.url || '', 'http://localhost');
  const token = url.searchParams.get('token');

  if (!token) throw new Error('No token provided');

  // 1. Dev mode fake token check
  if (isDev && token.startsWith('fake-jwt-token-')) {
    const userId = url.searchParams.get('userId') || 'dev-user';
    return { userId };
  }

  // 2. Try extracting user ID from JWT payload
  const extractedUserId = tryExtractUserId(token);
  if (extractedUserId) {
    return { userId: extractedUserId };
  }

  // 3. Fallback: verify via auth-service
  try {
    const response = await fetch(AUTH_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const session = await response.json();
      if (session?.user?.id) {
        return { userId: session.user.id };
      }
    }
  } catch (err) {
    console.warn('[Notes:WS:Auth] Auth-service verify failed:', err);
  }

  throw new Error('Unauthorized WebSocket connection');
};
