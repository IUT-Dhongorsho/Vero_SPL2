import { Server } from 'socket.io';
import { createServer } from 'http';
import { socketDelivery } from '../services/delivery/socket.delivery.js';

export const initSocketServer = (httpServer: any) => {
  const io = new Server(httpServer, {
    path: '/notifications/socket.io/',
    cors: {
      origin: '*', // Adjust for production
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string;

    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`👤 User ${userId} connected to notifications socket`);
    }

    socket.on('disconnect', () => {
      console.log('🔌 User disconnected from notifications socket');
    });
  });

  // Initialize the socket delivery service with this IO instance
  socketDelivery.init(io);

  return io;
};
