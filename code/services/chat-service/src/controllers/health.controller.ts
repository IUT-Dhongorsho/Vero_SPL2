import { Request, Response } from 'express';
import { db } from '../db/client.js';
import { sql } from 'drizzle-orm';
import { redisClient } from '../services/publisher.service.js';

export class HealthController {
  async check(req: Request, res: Response) {
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unknown',
        redis: 'unknown',
      }
    };

    try {
      // Check Database
      await db.execute(sql`SELECT 1`);
      healthStatus.services.database = 'healthy';
    } catch (error) {
      healthStatus.services.database = 'unhealthy';
      healthStatus.status = 'error';
    }

    try {
      // Check Redis
      const ping = await redisClient.ping();
      healthStatus.services.redis = ping === 'PONG' ? 'healthy' : 'unhealthy';
    } catch (error) {
      healthStatus.services.redis = 'unhealthy';
      healthStatus.status = 'error';
    }

    const statusCode = healthStatus.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  }
}

export const healthController = new HealthController();
