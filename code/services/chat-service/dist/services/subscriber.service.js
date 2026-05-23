import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { users } from '../models/user.model.js';
export const subClient = new Redis(env.REDIS_URL);
export class SubscriberService {
    async init() {
        await subClient.subscribe('user_events');
        subClient.on('message', async (channel, message) => {
            if (channel === 'user_events') {
                const event = JSON.parse(message);
                await this.handleUserEvent(event);
            }
        });
        console.log('📡 Subscriber service initialized and listening for user_events');
    }
    async handleUserEvent(event) {
        const { type, data } = event;
        switch (type) {
            case 'USER_CREATED':
            case 'USER_UPDATED':
                await db.insert(users).values({
                    id: data.id,
                    name: data.name,
                    avatarUrl: data.avatarUrl,
                }).onConflictDoUpdate({
                    target: users.id,
                    set: {
                        name: data.name,
                        avatarUrl: data.avatarUrl,
                        updatedAt: new Date(),
                    },
                });
                console.log(`👤 Local user-ref ${type}: ${data.id}`);
                break;
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
