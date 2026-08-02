import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import taskRoutes from './routes/task.routes.js';
import columnRoutes from './routes/column.routes.js';
import boardRoutes from './routes/board.routes.js';
import personalTaskRoutes from './routes/personalTask.routes.js';

const app = express();

app.use(cors({ origin: (_origin, callback) => callback(null, true), credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'board-service' });
});

// Personal work routes are mounted first so `/personal-tasks` and `/my/*` are
// not swallowed by the `/tasks/:projectId` wildcard below.
app.use('/api/board', personalTaskRoutes);
app.use('/api/board/tasks', taskRoutes);
app.use('/api/board/columns', columnRoutes);
app.use('/api/board', boardRoutes);

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Board service running on port ${env.PORT}`);
});

export { app, server };
