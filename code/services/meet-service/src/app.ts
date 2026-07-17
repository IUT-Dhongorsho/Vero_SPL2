import express from 'express';
import http from 'http';
import cors from 'cors';

import { env } from './config/env.js';
import { sfuService } from './services/sfu.service.js';
import { publisherService } from './services/publisher.service.js';
import { subscriberService } from './services/subscriber.service.js';
import { initSocketServer } from './ws/ws-server.js';

import { loggerMiddleware } from './middleware/logger.js';
import { metricsMiddleware } from './middleware/monitor.middleware.js';
import { signalController } from './controllers/signal.controller.js';
import { metricsController } from './controllers/metrics.controller.js';
import roomRoutes from './routes/room.routes.js';

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(loggerMiddleware);
app.use(metricsMiddleware);
app.use(express.json());

app.use('/rooms', roomRoutes);
app.get('/signal/info', signalController.getInfo);
app.get('/metrics', metricsController.getMetrics);
app.get('/health', async (_req, res) => {
  res.json({
    status: 'ok',
    service: 'meet-service',
    uptime: process.uptime(),
    activeRooms: (await import('./services/room.service.js')).roomService.getRoomCount(),
  });
});

async function bootstrap() {
  await sfuService.init();
  publisherService.init();
  await subscriberService.init();
  initSocketServer(server);

  server.listen(env.PORT, () => {
    console.log(`🚀 Meet service running on port ${env.PORT} [${env.NODE_ENV}]`);
    console.log(`📡 WebRTC SFU announced IP: ${env.MEDIASOUP_ANNOUNCED_IP}`);
    console.log(`🎯 RTC port range: ${env.MEDIASOUP_MIN_PORT}–${env.MEDIASOUP_MAX_PORT}`);
  });
}

async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down meet-service...`);
  await sfuService.shutdown();
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
