import express from 'express';
import cors from 'cors';
import { loggerMiddleware } from './middleware/logger.js';
import { metricsMiddleware } from './middleware/monitor.middleware.js';
import { metricsController } from './controllers/metrics.controller.js';
import projectRoutes from './routes/project.routes.js';

export const app = express();

// Middleware
app.use(loggerMiddleware);
app.use(metricsMiddleware);
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/project', projectRoutes);

app.get('/metrics', metricsController.getMetrics);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'project-service' });
});
