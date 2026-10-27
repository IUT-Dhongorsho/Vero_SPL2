import { Redis } from 'ioredis';
import { REDIS_CHANNELS } from '@repo/shared';
import { env } from '../config/env.js';

export const redisClient = new Redis(env.REDIS_URL);

export class PublisherService {
  async publish(channel: string, message: any) {
    await redisClient.publish(channel, JSON.stringify(message));
  }

  /** Connection requests and @mentions, for notification-service. Never throws. */
  async connectionEvent(
    type: 'connection.requested' | 'connection.accepted' | 'message.mentioned',
    data: Record<string, unknown>
  ) {
    try {
      await this.publish(REDIS_CHANNELS.CHAT_EVENTS, { type, data, timestamp: new Date().toISOString() });
    } catch (error: any) {
      console.error(`❌ [chat-service:publisher] ${type} failed:`, error.message);
    }
  }
}

export const publisherService = new PublisherService();
