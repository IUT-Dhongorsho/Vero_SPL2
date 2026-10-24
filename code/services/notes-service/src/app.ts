import express from 'express';
import cors from 'cors';
import { loggerMiddleware } from './middleware/logger.js';
import { metricsMiddleware } from './middleware/monitor.middleware.js';
import { metricsController } from './controllers/metrics.controller.js';
import { documentRouter } from './routes/document.routes.js';

export const app = express();

// Middleware
app.use(cors({ 
  origin: true, 
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '4mb' }));
app.use(loggerMiddleware);
app.use(metricsMiddleware);

// Public endpoints come before the authenticated router, which is also
// mounted at the root and would otherwise answer them with a 401.
app.get('/metrics', metricsController.getMetrics);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'notes-service' });
});

// Bypass Express router for /yjs WebSocket requests
app.use((req, res, next) => {
  if (req.path.includes('/yjs')) {
    return res.status(426).send('Upgrade Required');
  }
  next();
});

// Reached as /api/notes/* directly (Vite proxy) and as /* behind nginx.
app.use('/api/notes', documentRouter);
app.use('/', documentRouter);
