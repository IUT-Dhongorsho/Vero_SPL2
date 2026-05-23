import { redisClient } from '../../services/publisher.service.js';
const PRESENCE_KEY_PREFIX = 'presence:';
export class PresenceStore {
    async setUserOnline(userId, socketId) {
        await redisClient.hset(`${PRESENCE_KEY_PREFIX}${userId}`, 'status', 'online', 'lastSeen', Date.now().toString());
    }
    async setUserOffline(userId) {
        await redisClient.hset(`${PRESENCE_KEY_PREFIX}${userId}`, 'status', 'offline', 'lastSeen', Date.now().toString());
    }
    async getUserStatus(userId) {
        return await redisClient.hgetall(`${PRESENCE_KEY_PREFIX}${userId}`);
    }
}
export const presenceStore = new PresenceStore();
