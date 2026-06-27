import express from 'express';
import { createServer } from 'http';
import { env } from './config/env.js';
import { subscriberService } from './services/subscriber.service.js';
import { jobProcessorService } from './services/job-processor.service.js';
import { initSocketServer } from './ws/socket-server.js';
import notificationRoutes from './routes/notification.routes.js';

export const app = express();
export const httpServer = createServer(app);

// Initialize Services
if (process.env.NODE_ENV !== 'test') {
    subscriberService.init().catch(console.error);
    jobProcessorService.init();
    initSocketServer(httpServer);
}

app.use(express.json());

app.use('/notifications', notificationRoutes);

// Placeholder for routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'notification-service' });
});

if (process.env.NODE_ENV !== 'test') {
    httpServer.listen(env.PORT, () => {
        console.log(`🚀 Notification service running on port ${env.PORT}`);
    });
}
