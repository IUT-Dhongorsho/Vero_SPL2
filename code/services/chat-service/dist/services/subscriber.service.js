import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { users, sessions } from '../models/user.model.js';
import { eq } from 'drizzle-orm';
export const subClient = new Redis(env.REDIS_URL);
export class SubscriberService {
    async init() {
        await subClient.subscribe('user_events');
        subClient.on('message', async (channel, message) => {
            if (channel === 'user_events') {
                const event = JSON.parse(message);
                await this.handleAuthEvent(event);
            }
        });
        console.log('📡 Chat Subscriber service initialized');
    }
    async handleAuthEvent(event) {
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
                    }
                    else {
                        console.error(`❌ [SubscriberService] CRITICAL: Received SESSION_CREATED but authToken is MISSING in data!`);
                    }
                    await db.insert(sessions).values({
                        id: data.id,
                        token: data.token,
                        userId: data.userId,
                        expiresAt: new Date(data.expiresAt),
                        createdAt: new Date(data.createdAt),
                        authToken: data.authToken,
                        refreshToken: data.refreshToken,
                    });
                    console.log(`✅ [SubscriberService] Session successfully replicated: ${data.id}`);
                    break;
                case 'SESSION_DELETED':
                    console.log(`🚫 [SubscriberService] Revoking session token: ${data.token.substring(0, 10)}...`);
                    await db.delete(sessions).where(eq(sessions.token, data.token));
                    console.log(`🚫 Session revoked: ${data.id}`);
                    break;
            }
        }
        catch (error) {
            console.error(`❌ [SubscriberService] Error processing ${type}:`, error);
        }
    }
    async subscribe(channel, callback) {
        await subClient.subscribe(channel);
        subClient.on('message', (chan, message) => {
            if (chan === channel) {
                callback(JSON.parse(message));
            }
        });
    }
}
export const subscriberService = new SubscriberService();
