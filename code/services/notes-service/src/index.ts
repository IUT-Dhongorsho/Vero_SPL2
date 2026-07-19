import http from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { env } from './config/env.js';
import { subscriberService } from './services/subscriber.service.js';
import { attachYjsServer } from './ws/yjs-server.js';

const server = http.createServer(app);

// Initialize Subscriber
subscriberService.init().catch(console.error);

// Socket.io for collaboration
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 [Notes:Socket] New connection: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`🔌 [Notes:Socket] Disconnected: ${socket.id}`);
  });
});

attachYjsServer(server);

server.listen(env.PORT, () => {
    console.log(`🚀 Notes service running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

