import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { handleConnection } from './handlers/connection.handler.js';
export const initSocketServer = (server) => {
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });
    const pubClient = new Redis(env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    io.use(authMiddleware);
    io.on('connection', (socket) => {
        handleConnection(io, socket);
    });
    return io;
};
