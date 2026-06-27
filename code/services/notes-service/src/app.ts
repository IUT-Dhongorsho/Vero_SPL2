import express from 'express';
import { loggerMiddleware } from './middleware/logger.js';
import { metricsMiddleware } from './middleware/monitor.middleware.js';
import { metricsController } from './controllers/metrics.controller.js';

export const app = express();

// Middleware
app.use(loggerMiddleware);
app.use(metricsMiddleware);
app.use(express.json());

app.get('/metrics', metricsController.getMetrics);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'notes-service' });
});
