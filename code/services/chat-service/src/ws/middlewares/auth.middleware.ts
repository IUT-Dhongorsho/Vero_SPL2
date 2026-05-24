import { Socket } from 'socket.io';
import { env } from '../../config/env.js';
import { db } from '../../db/client.js';
import { users, sessions } from '../../models/user.model.js';
import { eq, and, gt, or } from 'drizzle-orm';

export interface AuthSocket extends Socket {
  user?: {
    id: string;
    [key: string]: any;
  };
}

export const authMiddleware = async (socket: AuthSocket, next: (err?: Error) => void) => {
  const authHeader = socket.handshake.auth.token || socket.handshake.headers['authorization'];

  if (!authHeader) {
    return next(new Error('Authentication error: Token not provided'));
  }

  try {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    console.log(`🔍 [WS:AuthMiddleware] Verifying token: ${token.substring(0, 15)}...`);

    // 1. Locally verify the session against our REPLICA table
    // We check BOTH the custom authToken (JWT) and the standard token for compatibility
    const activeSession = await db.query.sessions.findFirst({
      where: and(
        or(
          eq(sessions.authToken, token),
          eq(sessions.token, token)
        ),
        gt(sessions.expiresAt, new Date())
      ),
      with: {
        user: true
      }
    });

    if (!activeSession) {
      console.warn('❌ [WS:AuthMiddleware] No active session found or expired for token.');
      
      const byAuthToken = await db.query.sessions.findFirst({ where: eq(sessions.authToken, token) });
      const byToken = await db.query.sessions.findFirst({ where: eq(sessions.token, token) });
      
      console.log(`📊 [WS:AuthMiddleware] Debug Lookup: Match in authToken col: ${!!byAuthToken}, Match in token col: ${!!byToken}`);
      
      return next(new Error('Authentication error: Invalid or expired session'));
    }

    if (activeSession.authToken === token) {
      console.log('✅ [WS:AuthMiddleware] Socket verified via Custom JWT');
    } else {
      console.log('⚠️ [WS:AuthMiddleware] Socket verified via standard BetterAuth token');
    }

    if (!activeSession.user) {
      console.warn('❌ [WS:AuthMiddleware] Session found but associated user is missing in replica.');
      return next(new Error('Authentication error: User not synced'));
    }

    console.log('✅ [WS:AuthMiddleware] Authorized socket user:', activeSession.user.id);

    socket.user = activeSession.user;
    (socket as any).session = activeSession;
    next();
  } catch (err) {
    next(new Error('Authentication error: Local verification failed'));
  }
};
