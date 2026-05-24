import { Request, Response } from 'express';
import { register } from '../monitoring/metrics.js';

export class MetricsController {
  async getMetrics(req: Request, res: Response) {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (ex) {
      res.status(500).end(ex);
    }
  }
}

export const metricsController = new MetricsController();
