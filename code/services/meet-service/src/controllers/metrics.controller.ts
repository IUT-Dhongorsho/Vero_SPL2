import { Request, Response } from 'express';
import { register } from '../monitoring/metrics.js';

export const metricsController = {
  async getMetrics(req: Request, res: Response): Promise<void> {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  },
};
