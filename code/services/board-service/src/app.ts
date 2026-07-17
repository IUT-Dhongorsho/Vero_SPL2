import express from 'express';
import { env } from './config/env.js';
import taskRoutes from './routes/task.routes.js';
import columnRoutes from './routes/column.routes.js';
import boardRoutes from './routes/board.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'board-service' });
});

app.use('/api/board/tasks', taskRoutes);
app.use('/api/board/columns', columnRoutes);
app.use('/api/board', boardRoutes);

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Board service running on port ${env.PORT}`);
});

export { app, server };
