import { Redis } from 'ioredis';
import { env } from '../config/env.js';

// We need REDIS_URL in env.ts
export const redisClient = new Redis(env.REDIS_URL);

export type AuthEvent = 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'SESSION_CREATED' | 'SESSION_DELETED';

export class PublisherService {
  async publishUserEvent(type: AuthEvent, data: any) {
    const event = {
      type,
      data
    };
    console.log(`📡 [PublisherService] Attempting to publish ${type} for ID: ${data.id}`);
    if (type === 'SESSION_CREATED') {
        console.log(`🔑 [PublisherService] Session Details - AuthToken: ${data.authToken ? 'Present' : 'MISSING'}, UserId: ${data.userId}`);
    }
    await redisClient.publish('user_events', JSON.stringify(event));
    console.log(`✅ [PublisherService] Successfully published ${type}`);
  }
}

export const publisherService = new PublisherService();
