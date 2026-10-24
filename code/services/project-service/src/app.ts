import express from 'express';
import { loggerMiddleware } from './middleware/logger.js';
import { metricsMiddleware } from './middleware/monitor.middleware.js';
import { metricsController } from './controllers/metrics.controller.js';
import projectRoutes from './routes/project.routes.js';

export const app = express();

// Middleware
app.use(loggerMiddleware);
app.use(metricsMiddleware);
app.use(express.json());

// Health & metrics (unauthenticated)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'project-service' });
});
app.get('/project/health', (req, res) => {
    res.json({ status: 'ok', service: 'project-service' });
});
app.get('/metrics', metricsController.getMetrics);

// Routes
app.use('/project', projectRoutes);
