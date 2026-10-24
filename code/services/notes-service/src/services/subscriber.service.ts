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

    console.log('📡 Notes Subscriber service initialized');
  }

  private async handleAuthEvent(event: any) {
    const { type, data } = event;
    console.log(`📡 [SubscriberService] Received event: ${type}`);
    
    try {
      switch (type) {
        case 'USER_CREATED':
        case 'USER_UPDATED':
          console.log(`👤 [SubscriberService] Syncing user: ${data.id}`);
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
          console.log(`👤 User synced: ${data.id}`);
          break;

        case 'USER_DELETED':
          console.log(`🗑️ [SubscriberService] Deleting user: ${data.id}`);
          await db.delete(users).where(eq(users.id, data.id));
          console.log(`🗑️ User deleted: ${data.id}`);
          break;

        case 'SESSION_CREATED':
          console.log(`🔑 [SubscriberService] Replicating session: ${data.id} for user: ${data.userId}`);
          if (data.authToken) {
            console.log(`📡 [SubscriberService] Received AuthToken: ${data.authToken.substring(0, 20)}...`);
          } else {
            console.warn(`⚠️ [SubscriberService] authToken is missing in SESSION_CREATED event.`);
          }

          // Ensure user exists to satisfy foreign key constraint
          const existingUser = await db.query.users.findFirst({ where: eq(users.id, data.userId) });
          if (!existingUser) {
            let name = data.user?.name;
            let avatarUrl = data.user?.image || null;
            if (!name && data.authToken) {
              try {
                const parts = data.authToken.split('.');
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                name = payload.name;
              } catch (_) {}
            }
            name = name || 'User';
            await db.insert(users).values({
              id: data.userId,
              name,
              avatarUrl,
            }).onConflictDoUpdate({
              target: users.id,
              set: { name, avatarUrl, updatedAt: new Date() }
            });
            console.log(`👤 [SubscriberService] Auto-replicated user ${data.userId} for session`);
          }

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
            },
          });
          console.log(`✅ [SubscriberService] Session successfully replicated: ${data.id}`);
          break;

        case 'SESSION_DELETED':
          console.log(`🚫 [SubscriberService] Revoking session token: ${data.token?.substring(0, 10)}...`);
          await db.delete(sessions).where(eq(sessions.token, data.token));
          console.log(`🚫 Session revoked: ${data.id}`);
          break;
      }
    } catch (error) {
      console.error(`❌ [SubscriberService] Error processing ${type}:`, error);
    }
  }
}

export const subscriberService = new SubscriberService();
