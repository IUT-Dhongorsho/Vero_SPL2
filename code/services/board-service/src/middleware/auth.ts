import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client.js';
import { sessions } from '../models/user.model.js';
import { eq, and, gt } from 'drizzle-orm';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  try {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    
    // 1. Locally verify the session against our REPLICA table
    const activeSession = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.token, token),
        gt(sessions.expiresAt, new Date())
      ),
      with: {
        user: true
      }
    });

    if (!activeSession || !activeSession.user) {
       return res.status(401).json({ error: 'Invalid or expired session' });
    }

    (req as any).user = activeSession.user;
    (req as any).session = activeSession;
    
    next();
  } catch (err: any) {
    console.error('Board Session Verification Error:', err.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
