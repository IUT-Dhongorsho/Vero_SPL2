import { db } from '../db/client.js';
import { messages, messageReceipts } from '../models/message.model.js';
export class MessageService {
    async saveMessage(payload, senderId) {
        const [message] = await db.insert(messages).values({
            channelId: payload.channelId,
            senderId,
            content: payload.content,
        }).returning();
        return message;
    }
    async saveReceipt(payload, userId) {
        const [receipt] = await db.insert(messageReceipts).values({
            messageId: payload.messageId,
            userId,
            status: payload.status,
        }).returning();
        return receipt;
    }
}
export const messageService = new MessageService();
