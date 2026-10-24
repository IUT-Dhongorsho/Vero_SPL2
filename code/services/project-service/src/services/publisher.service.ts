import { Redis } from 'ioredis';
import { REDIS_CHANNELS, type DomainEvent, type RedisChannel } from '@repo/shared';
import { env } from '../config/env.js';

const pubClient = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });

/**
 * Fire-and-forget domain events. A notification that fails to publish must
 * never fail the request that caused it, so errors are logged, not thrown.
 */
export const publisherService = {
  async publish(channel: RedisChannel, event: DomainEvent) {
    try {
      if (pubClient.status === 'wait') await pubClient.connect();
      await pubClient.publish(channel, JSON.stringify({ ...event, timestamp: new Date().toISOString() }));
    } catch (error: any) {
      console.error(`❌ [Publisher] ${channel}/${event.type} failed:`, error.message);
    }
  },

  project(event: DomainEvent) {
    return this.publish(REDIS_CHANNELS.PROJECT_EVENTS, event);
  },

  resource(event: DomainEvent) {
    return this.publish(REDIS_CHANNELS.RESOURCE_EVENTS, event);
  },
};
