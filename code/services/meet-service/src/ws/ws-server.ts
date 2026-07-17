import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { and, eq, gt, or } from 'drizzle-orm';

import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { sessions } from '../models/meeting.model.js';
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
      origin: env.CLIENT_URL,
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
