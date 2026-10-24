import { Server } from 'socket.io';
import { socketDelivery } from '../services/delivery/socket.delivery.js';
import { verifyCredentials } from '../middleware/auth.js';

export const initSocketServer = (httpServer: any) => {
  const io = new Server(httpServer, {
    path: '/notifications/socket.io/',
    cors: {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // The room a socket joins is derived from a verified session — never from a
  // client-supplied user id, which would let anyone read anyone's feed.
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    const userId = await verifyCredentials({
      authorization: typeof token === 'string' && token ? `Bearer ${token}` : undefined,
      cookie: socket.handshake.headers.cookie,
    });
    if (!userId) return next(new Error('Unauthorized'));
    socket.data.userId = userId;
    next();
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
  });

  socketDelivery.init(io);

  return io;
};
