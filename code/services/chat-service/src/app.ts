import express from 'express';
import cors from 'cors';
import http from 'http';
import { env } from './config/env.js';
import { initSocketServer } from './ws/socket-server.js';
import { initGrpcServer } from './grpc/server.js';
import { subscriberService } from './services/subscriber.service.js';
import { metricsMiddleware } from './middleware/monitor.middleware.js';
import channelRoutes from './routes/channel.routes.js';
import messageRoutes from './routes/message.routes.js';
import monitoringRoutes from './routes/monitoring.routes.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocketServer(server);

// Initialize gRPC
initGrpcServer();

// Initialize Subscriber
subscriberService.init().catch(console.error);

// Middleware
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

// Routes
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/', monitoringRoutes);

server.listen(env.PORT, () => {
    console.log(`🚀 Chat service running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});
