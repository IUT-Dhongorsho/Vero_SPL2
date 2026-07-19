import express from 'express';
import cors from 'cors';
import { loggerMiddleware } from './middleware/logger.js';
import { metricsMiddleware } from './middleware/monitor.middleware.js';
import { metricsController } from './controllers/metrics.controller.js';
import { documentRouter } from './routes/document.routes.js';

export const app = express();

// Middleware
app.use(cors({ 
  origin: ['http://localhost:3000', 'http://localhost:5173'], 
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
}));
app.use(loggerMiddleware);
app.use(metricsMiddleware);
// Bypass Express router for /yjs WebSocket requests
app.use((req, res, next) => {
  if (req.path.includes('/yjs')) {
    return res.status(426).send('Upgrade Required');
  }
  next();
});

app.use('/api/notes', documentRouter);
app.use('/', documentRouter);

app.get('/metrics', metricsController.getMetrics);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'notes-service' });
});
