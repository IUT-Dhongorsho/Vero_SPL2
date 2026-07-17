import { Redis } from 'ioredis';
import { env } from '../config/env.js';

class PublisherService {
  private publisher: Redis | null = null;

  init(): void {
    this.publisher = new Redis(env.REDIS_URL);
    this.publisher.on('error', (err) => {
      console.error('[Publisher] Redis error:', err);
    });
    console.log('✅ [Publisher] Redis publisher connected');
  }

  async publish(channel: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.publisher) {
      console.warn(`[Publisher] Publisher not initialised — skipping event "${channel}"`);
      return;
    }
    try {
      await this.publisher.publish(channel, JSON.stringify(payload));
    } catch (err) {
      console.error(`[Publisher] Failed to publish "${channel}":`, err);
    }
  }
}

export const publisherService = new PublisherService();
