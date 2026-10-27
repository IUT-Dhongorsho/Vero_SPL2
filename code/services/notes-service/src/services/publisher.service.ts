import { Redis } from 'ioredis';
import { REDIS_CHANNELS } from '@repo/shared';
import { env } from '../config/env.js';

let client: Redis | null = null;

/** Events for notification-service. Never throws: a lost notification must not fail the request. */
export async function publishNoteEvent(type: string, data: Record<string, unknown>) {
  try {
    client ??= new Redis(env.REDIS_URL);
    await client.publish(REDIS_CHANNELS.NOTE_EVENTS, JSON.stringify({ type, data, timestamp: new Date().toISOString() }));
  } catch (error: any) {
    console.error(`❌ [notes-service:publisher] ${type} failed:`, error.message);
  }
}
