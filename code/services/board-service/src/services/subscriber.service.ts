import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { tasks } from '../models/task.model.js';
import { workspaceMembers } from '../models/member.model.js';
import { users, sessions } from '../models/user.model.js';
import { eq } from 'drizzle-orm';

export const subClient = new Redis(env.REDIS_URL);

export class SubscriberService {
  async init() {
    await subClient.subscribe('user_events');
    
    subClient.on('message', async (channel: string, message: string) => {
      if (channel === 'user_events') {
        const event = JSON.parse(message);
        await this.handleAuthEvent(event);
      }
    });

    console.log('📡 Board Subscriber service initialized');
  }

  private async handleAuthEvent(event: any) {
    const { type, data } = event;
    
    try {
      switch (type) {
        case 'USER_CREATED':
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
          console.log(`👤 User synced: ${data.id}`);
          break;

        case 'USER_DELETED':
          // 1. Remove from workspace memberships
          await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, data.id));
          
          // 2. Unassign from tasks (set assigneeId to null)
          await db.update(tasks)
            .set({ assigneeId: null })
            .where(eq(tasks.assigneeId, data.id));

          // 3. Delete local user ref
          await db.delete(users).where(eq(users.id, data.id));

          console.log(`🗑️ User DELETED: Data cleaned up in Board Service for ${data.id}`);
          break;

        case 'SESSION_CREATED':
          await db.insert(sessions).values({
            id: data.id,
            token: data.token,
            userId: data.userId,
            expiresAt: new Date(data.expiresAt),
            createdAt: new Date(data.createdAt),
            authToken: data.authToken,
            refreshToken: data.refreshToken,
          });
          console.log(`🔑 Session replicated: ${data.id}`);
          break;

        case 'SESSION_DELETED':
          await db.delete(sessions).where(eq(sessions.token, data.token));
          console.log(`🚫 Session revoked: ${data.id}`);
          break;
      }
    } catch (error) {
      console.error(`❌ Failed to process ${type}:`, error);
    }
  }
}

export const subscriberService = new SubscriberService();
