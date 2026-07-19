import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { users, sessions } from '../models/meeting.model.js';
import { eq } from 'drizzle-orm';

const SUBSCRIBED_CHANNELS = ['user_events'];

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
      if (channel === 'user_events') {
        try {
          const event = JSON.parse(message);
          await this.handleAuthEvent(event);
        } catch (err) {
          console.error(`[Subscriber] Error processing message on "${channel}":`, err);
        }
      }
    });
  }

  private async handleAuthEvent(event: any) {
    const { type, data } = event;
    console.log(`📡 [SubscriberService] Received event: ${type}`);
    
    try {
      switch (type) {
        case 'USER_CREATED':
        case 'USER_UPDATED':
          console.log(`👤 [SubscriberService] Syncing user: ${data.id}`);
          await db
            .insert(users)
            .values({
              id: data.id,
              name: data.name,
              avatarUrl: data.image || data.avatarUrl || null,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: users.id,
              set: {
                name: data.name,
                avatarUrl: data.image || data.avatarUrl || null,
                updatedAt: new Date(),
              },
            });
          break;

        case 'USER_DELETED':
          await db.delete(users).where(eq(users.id, data.id));
          break;

        case 'SESSION_CREATED':
          await db.insert(users).values({
            id: data.userId,
            name: 'User',
          }).onConflictDoNothing();

          await db
            .insert(sessions)
            .values({
              id: data.id,
              token: data.token,
              userId: data.userId,
              expiresAt: new Date(data.expiresAt),
              createdAt: new Date(data.createdAt),
              authToken: data.authToken || null,
              refreshToken: data.refreshToken || null,
            })
            .onConflictDoUpdate({
              target: sessions.id,
              set: {
                token: data.token,
                expiresAt: new Date(data.expiresAt),
                authToken: data.authToken || null,
                refreshToken: data.refreshToken || null,
              },
            });
          console.log(`🔑 Session replicated: ${data.id}`);
          break;

        case 'SESSION_DELETED':
          if (data.token) {
              await db.delete(sessions).where(eq(sessions.token, data.token));
          } else if (data.id) {
              await db.delete(sessions).where(eq(sessions.id, data.id));
          }
          break;
      }
    } catch (error) {
      console.error(`❌ [SubscriberService] Error processing ${type}:`, error);
    }
  }
}

export const subscriberService = new SubscriberService();
