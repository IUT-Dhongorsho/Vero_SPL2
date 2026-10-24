import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { users, sessions } from '../models/user.model.js';

import { eq } from 'drizzle-orm';

export const subClient = new Redis(env.REDIS_URL);

function safeDate(val: any, fallback: Date = new Date()): Date {
  if (!val) return fallback;
  const d = new Date(val);
  return isNaN(d.getTime()) ? fallback : d;
}

export class SubscriberService {
  async init() {
    await subClient.subscribe('user_events');
    
    subClient.on('message', async (channel: string, message: string) => {
      if (channel === 'user_events') {
        const event = JSON.parse(message);
        await this.handleAuthEvent(event);
      }
    });

    console.log('📡 Project Subscriber service initialized');
  }

  private async handleAuthEvent(event: any) {
    const { type, data } = event;
    console.log(`📡 [SubscriberService] Received event: ${type}`);
    
    try {
      switch (type) {
        case 'USER_CREATED':
          console.log(`👤 [SubscriberService] Syncing user: ${data.id}`);
          await db.transaction(async (tx) => {
              // 1. Sync User
              await tx.insert(users).values({
                id: data.id,
                name: data.name,
                avatarUrl: data.image || data.avatarUrl,
              }).onConflictDoUpdate({
                target: users.id,
                set: {
                  name: data.name,
                  avatarUrl: data.image || data.avatarUrl,
                  updatedAt: new Date(),
                },
              });

              console.log(`👤 [SubscriberService] Synced user: ${data.id}`);
          });
          break;

        case 'USER_UPDATED':
            await db.insert(users).values({
                id: data.id,
                name: data.name,
                avatarUrl: data.image || data.avatarUrl,
            }).onConflictDoUpdate({
                target: users.id,
                set: {
                    name: data.name,
                    avatarUrl: data.image || data.avatarUrl,
                    updatedAt: new Date(),
                },
            });
            break;

        case 'USER_DELETED':
          await db.delete(users).where(eq(users.id, data.id));
          console.log(`🗑️ User deleted: ${data.id}`);
          break;

        case 'SESSION_CREATED':
          // Upsert a user to avoid Foreign Key violations if the USER_CREATED 
          // event was dropped or arrived out of order (common in basic Redis Pub/Sub).
          let userName = data.user?.name;
          let userAvatar = data.user?.image || null;
          if (!userName && data.authToken) {
            try {
              const parts = data.authToken.split('.');
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
              userName = payload.name;
            } catch (_) {}
          }
          userName = userName || 'User';

          await db.insert(users).values({
            id: data.userId,
            name: userName,
            avatarUrl: userAvatar,
          }).onConflictDoUpdate({
            target: users.id,
            set: { name: userName, avatarUrl: userAvatar, updatedAt: new Date() }
          });

          const expiresAt = safeDate(data.expiresAt, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
          const createdAt = safeDate(data.createdAt, new Date());

          await db.insert(sessions).values({
            id: data.id,
            token: data.token,
            userId: data.userId,
            expiresAt,
            createdAt,
            authToken: data.authToken,
            refreshToken: data.refreshToken,
          }).onConflictDoUpdate({
            target: sessions.id,
            set: {
              token: data.token,
              expiresAt,
              authToken: data.authToken,
              refreshToken: data.refreshToken,
            }
          });
          console.log(`🔑 Session replicated: ${data.id}`);
          break;

        case 'SESSION_DELETED':
          await db.delete(sessions).where(eq(sessions.token, data.token));
          break;
      }
    } catch (error) {
      console.error(`❌ [SubscriberService] Error processing ${type}:`, error);
    }
  }
}

export const subscriberService = new SubscriberService();
