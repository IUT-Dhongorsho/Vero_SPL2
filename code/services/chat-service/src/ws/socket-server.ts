import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { authMiddleware, AuthSocket } from './middlewares/auth.middleware.js';
import { handleConnection } from './handlers/connection.handler.js';

export const initSocketServer = (server: any) => {
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
  });

  const pubClient = new Redis(env.REDIS_URL);
  const subClient = pubClient.duplicate();

  io.adapter(createAdapter(pubClient, subClient));

  io.use(authMiddleware as any);

  io.on('connection', (socket: AuthSocket) => {
    console.log(`🔌 [WS:Server] New socket connection attempt: ${socket.id}`);
    handleConnection(io, socket);
  });

  return io;
};
