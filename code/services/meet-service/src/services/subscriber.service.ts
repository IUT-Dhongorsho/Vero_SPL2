/**
 * Subscriber Service — keeps shadow tables eventually consistent (Decision 005).
 *
 * Subscriptions:
 *   user.created / user.updated  → upsert into local `users` shadow table
 *   session.created / session.updated → upsert into local `sessions` shadow table
 *   session.deleted              → delete from local `sessions` shadow table
 *
 * This is the ONLY place allowed to write to the shadow tables.
 * See Architecture Decision 005 and Data Sync ADR for rationale.
 */
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { users, sessions } from '../models/meeting.model.js';
import { eq } from 'drizzle-orm';

const SUBSCRIBED_CHANNELS = [
  'user.created',
  'user.updated',
  'session.created',
  'session.updated',
  'session.deleted',
];

class SubscriberService {
  private subscriber: Redis | null = null;

  async init(): Promise<void> {
    this.subscriber = new Redis(env.REDIS_URL);

    this.subscriber.on('error', (err) => {
      console.error('[Subscriber] Redis error:', err);
    });

    await this.subscriber.subscribe(...SUBSCRIBED_CHANNELS);
    console.log(`✅ [Subscriber] Subscribed to: ${SUBSCRIBED_CHANNELS.join(', ')}`);

    this.subscriber.on('message', async (channel: string, message: string) => {
      try {
        const data = JSON.parse(message) as Record<string, unknown>;
        switch (channel) {
          case 'user.created':
          case 'user.updated':
            await this.upsertUser(data);
            break;
          case 'session.created':
          case 'session.updated':
            await this.upsertSession(data);
            break;
          case 'session.deleted':
            await this.deleteSession(data.id as string);
            break;
        }
      } catch (err) {
        console.error(`[Subscriber] Error processing message on "${channel}":`, err);
      }
    });
  }

  private async upsertUser(data: Record<string, unknown>): Promise<void> {
    await db
      .insert(users)
      .values({
        id: data.id as string,
        name: data.name as string,
        avatarUrl: (data.avatarUrl as string | null | undefined) ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: data.name as string,
          avatarUrl: (data.avatarUrl as string | null | undefined) ?? null,
          updatedAt: new Date(),
        },
      });
  }

  private async upsertSession(data: Record<string, unknown>): Promise<void> {
    await db
      .insert(sessions)
      .values({
        id: data.id as string,
        token: data.token as string,
        userId: data.userId as string,
        expiresAt: new Date(data.expiresAt as string),
        createdAt: new Date(data.createdAt as string),
        authToken: (data.authToken as string | null | undefined) ?? null,
        refreshToken: (data.refreshToken as string | null | undefined) ?? null,
      })
      .onConflictDoUpdate({
        target: sessions.id,
        set: {
          token: data.token as string,
          expiresAt: new Date(data.expiresAt as string),
          authToken: (data.authToken as string | null | undefined) ?? null,
          refreshToken: (data.refreshToken as string | null | undefined) ?? null,
        },
      });
  }

  private async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }
}

export const subscriberService = new SubscriberService();
