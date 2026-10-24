import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
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
    const isJWT = token.startsWith('eyJ');

    // 1. Locally verify the session against our REPLICA table
    let activeSession = await db.query.sessions.findFirst({
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

    let activeUser = activeSession?.user;

    // 2. Fallback: JWT verification
    if (!activeSession || !activeUser) {
      if (isJWT) {
        try {
          const payload = jwt.verify(token, env.BETTER_AUTH_SECRET, { algorithms: ['HS256'] }) as any;
          if (payload && payload.id) {
            let u = await db.query.users.findFirst({ where: eq(users.id, payload.id) });
            if (!u) {
              const [insertedUser] = await db.insert(users).values({
                id: payload.id,
                name: payload.name || 'User',
                avatarUrl: null
              }).onConflictDoUpdate({
                target: users.id,
                set: { name: payload.name || 'User', updatedAt: new Date() }
              }).returning();
              u = insertedUser;
            }
            activeUser = u;
            activeSession = {
              id: payload.sessionId || `jwt-${payload.id}`,
              token: token,
              userId: payload.id,
              authToken: token,
              expiresAt: payload.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              createdAt: new Date(),
              user: u
            } as any;
          }
        } catch {}
      }

      // 3. Fallback: auth-service internal verify
      if (!activeUser) {
        try {
          const verifyRes = await fetch(`${env.AUTH_SERVICE_URL}/internal/verify`, {
            headers: { authorization: `Bearer ${token}` }
          });
          if (verifyRes.ok) {
            const data = await verifyRes.json() as any;
            if (data?.user?.id) {
              let u = await db.query.users.findFirst({ where: eq(users.id, data.user.id) });
              if (!u) {
                const [insertedUser] = await db.insert(users).values({
                  id: data.user.id,
                  name: data.user.name || 'User',
                  avatarUrl: data.user.image || null
                }).onConflictDoUpdate({
                  target: users.id,
                  set: { name: data.user.name || 'User', avatarUrl: data.user.image || null, updatedAt: new Date() }
                }).returning();
                u = insertedUser;
              }
              activeUser = u;
              activeSession = {
                id: data.session?.id || `ext-${data.user.id}`,
                token: data.session?.token || token,
                userId: data.user.id,
                authToken: data.session?.authToken || token,
                expiresAt: new Date(data.session?.expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000),
                createdAt: new Date(),
                user: u
              } as any;
            }
          }
        } catch {}
      }
    }

    if (!activeSession || !activeUser) {
      return next(new Error('Authentication error: Invalid or expired session'));
    }

    socket.user = activeUser;
    (socket as any).session = activeSession;
    next();
  } catch (err) {
    next(new Error('Authentication error: Local verification failed'));
  }
};
