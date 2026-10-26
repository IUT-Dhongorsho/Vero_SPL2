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
app.use(loggerMiddleware);
app.use(express.json({ limit: '4mb' }));
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

// Body-parser failures (malformed JSON) answer in the API's JSON shape rather
// than Express's HTML error page.
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request body is not valid JSON', code: 'VALIDATION_FAILED' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'The request is too large', code: 'VALIDATION_FAILED' });
  }
  next(err);
});
