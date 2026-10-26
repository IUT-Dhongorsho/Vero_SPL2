import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { and, eq, gt, or } from 'drizzle-orm';

import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { users, sessions } from '../models/meeting.model.js';
import { registerSignalHandlers } from './message-router.js';

export interface AuthSocket extends Socket {
  user?: { id: string; name: string; [key: string]: unknown };
}

const authMiddleware = async (
  socket: AuthSocket,
  next: (err?: Error) => void
): Promise<void> => {
  const raw =
    (socket.handshake.auth as Record<string, string>).token ||
    socket.handshake.headers['authorization'];

  if (!raw) {
    return next(new Error('Authentication required: no token provided'));
  }

  const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;

  try {
    const activeSession = await db.query.sessions.findFirst({
      where: and(
        or(eq(sessions.authToken, token), eq(sessions.token, token)),
        gt(sessions.expiresAt, new Date())
      ),
      with: { user: true },
    });

    if (!activeSession?.user) {
      // Fallback: Query auth-service /internal/verify in case session replication lagged
      try {
        const verifyRes = await fetch(`${env.AUTH_SERVICE_URL}/internal/verify`, {
          headers: { authorization: `Bearer ${token}` },
        });
        if (verifyRes.ok) {
          const data = (await verifyRes.json()) as any;
          if (data?.user?.id) {
            await db
              .insert(users)
              .values({
                id: data.user.id,
                name: data.user.name || 'User',
                avatarUrl: data.user.image || null,
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: users.id,
                set: {
                  name: data.user.name || 'User',
                  avatarUrl: data.user.image || null,
                  updatedAt: new Date(),
                },
              });

            await db
              .insert(sessions)
              .values({
                id: data.session?.id || `ext-${data.user.id}`,
                token: data.session?.token || token,
                userId: data.user.id,
                authToken: data.session?.authToken || token,
                expiresAt: new Date(
                  data.session?.expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000
                ),
                createdAt: new Date(),
              })
              .onConflictDoUpdate({
                target: sessions.id,
                set: {
                  authToken: data.session?.authToken || token,
                  expiresAt: new Date(
                    data.session?.expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000
                  ),
                },
              });

            socket.user = data.user;
            console.log(`✅ [Meet:Auth] Authenticated via /internal/verify fallback: ${data.user.id}`);
            return next();
          }
        }
      } catch (verifyErr: any) {
        console.warn('[Meet:Auth] /internal/verify fallback check failed:', verifyErr.message);
      }

      console.warn(`[Meet:Auth] No active session for token ${token.slice(0, 12)}...`);
      return next(new Error('Authentication error: invalid or expired session'));
    }

    socket.user = activeSession.user as AuthSocket['user'];
    next();
  } catch (err) {
    console.error('[Meet:Auth] Session lookup failed:', err);
    next(new Error('Authentication error: internal error'));
  }
};

export function initSocketServer(server: import('http').Server): Server {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const pubClient = new Redis(env.REDIS_URL);
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use(authMiddleware as Parameters<typeof io.use>[0]);

  io.on('connection', (socket: AuthSocket) => {
    console.log(
      `🔌 [Meet:WS] User ${socket.user?.id} connected (socketId: ${socket.id})`
    );
    registerSignalHandlers(io, socket);
  });

  return io;
}
