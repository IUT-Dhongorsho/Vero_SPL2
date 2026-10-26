import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { users } from '../models/user.model.js';
import { eq } from 'drizzle-orm';
import { eventRouter } from './event-router.service.js';

export const subClient = new Redis(env.REDIS_URL);

export class SubscriberService {
  async init() {
    // Listen to generic user events for shadow table sync
    await subClient.subscribe('user_events');
    
    // Listen to specific notification trigger channels
    await subClient.subscribe('project_events');
    await subClient.subscribe('task_events');
    await subClient.subscribe('chat_events');
    await subClient.subscribe('meet_events');
    await subClient.subscribe('note_events');
    await subClient.subscribe('resource_events');
    await subClient.subscribe('mail_events');

    subClient.on('message', async (channel: string, message: string) => {
      try {
        const event = JSON.parse(message);
        
        if (channel === 'user_events') {
          await this.handleUserSyncEvent(event);
        } else {
          // Route all other domain events to the event router
          await eventRouter.route(channel, event);
        }
      } catch (error) {
        console.error(`❌ Error processing Redis message from ${channel}:`, error);
      }
    });

    console.log('📡 Notification Subscriber service initialized');
  }

  private async handleUserSyncEvent(event: any) {
    const { type, data } = event;
    
    try {
      switch (type) {
        case 'USER_CREATED':
        case 'USER_UPDATED':
          await db.insert(users).values({
            id: data.id,
            name: data.name,
            email: data.email,
            avatarUrl: data.image || data.avatarUrl,
          }).onConflictDoUpdate({
            target: users.id,
            set: {
              name: data.name,
              email: data.email,
              avatarUrl: data.image || data.avatarUrl,
              syncedAt: new Date(),
            },
          });
          console.log(`👤 User synced: ${data.id}`);
          break;

        case 'USER_DELETED':
          await db.delete(users).where(eq(users.id, data.id));
          console.log(`🗑️ User DELETED: Data cleaned up in Notification Service for ${data.id}`);
          break;

        case 'SESSION_CREATED':
          const existingUser = await db.query.users.findFirst({ where: eq(users.id, data.userId) });
          if (!existingUser) {
            let name = data.user?.name;
            let email = data.user?.email || `${data.userId}@placeholder.com`;
            let avatarUrl = data.user?.image || null;
            if (!name && data.authToken) {
              try {
                const parts = data.authToken.split('.');
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                name = payload.name;
                email = payload.email || email;
              } catch (_) {}
            }
            name = name || 'User';
            await db.insert(users).values({
              id: data.userId,
              name,
              email,
              avatarUrl,
            }).onConflictDoNothing();
            console.log(`👤 User auto-synced on SESSION_CREATED: ${data.userId}`);
          }
          break;
      }
    } catch (error) {
      console.error(`❌ Failed to sync user ${type}:`, error);
    }
  }
}

export const subscriberService = new SubscriberService();
