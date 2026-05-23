import { db } from '../db/client.js';
import { messages } from '../models/message.model.js';
import { eq, desc } from 'drizzle-orm';
export class MessageController {
    async getChannelMessages(req, res) {
        try {
            const channelId = req.params.channelId;
            const channelMessages = await db.query.messages.findMany({
                where: eq(messages.channelId, channelId),
                orderBy: [desc(messages.createdAt)],
                limit: 50,
                with: {
                    sender: true,
                    receipts: true,
                },
            });
            res.json(channelMessages);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch messages' });
        }
    }
}
export const messageController = new MessageController();
