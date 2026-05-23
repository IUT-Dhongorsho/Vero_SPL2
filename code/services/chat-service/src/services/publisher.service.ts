import { Redis } from 'ioredis';
import { env } from '../config/env.js';

export const redisClient = new Redis(env.REDIS_URL);

export class PublisherService {
  async publish(channel: string, message: any) {
    await redisClient.publish(channel, JSON.stringify(message));
  }
}

export const publisherService = new PublisherService();
