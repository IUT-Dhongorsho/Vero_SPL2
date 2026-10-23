import { and, desc, eq, isNull, lt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { messages, messageReceipts } from '../models/message.model.js';
const ALLOWED_TYPES = new Set(['text', 'file', 'image', 'action', 'system']);
export class MessageService {
    async saveMessage(payload, senderId) {
        const type = ALLOWED_TYPES.has(payload.type ?? '') ? payload.type : 'text';
        const [message] = await db
            .insert(messages)
            .values({
            channelId: payload.channelId,
            senderId,
            content: payload.content ?? '',
            type,
            attachmentUrl: payload.attachment?.url ?? null,
            attachmentName: payload.attachment?.name ?? null,
            attachmentMime: payload.attachment?.mime ?? null,
            attachmentSize: payload.attachment?.size ?? null,
            replyToId: payload.replyToId ?? null,
        })
            .returning();
        return message;
    }
    /** Paginated history, returned oldest-first for rendering. */
    async getHistory(channelId, limit = 50, before) {
        let cutoff;
        if (before) {
            const [anchor] = await db
                .select({ createdAt: messages.createdAt })
                .from(messages)
                .where(eq(messages.id, before))
                .limit(1);
            cutoff = anchor?.createdAt;
        }
        const rows = await db.query.messages.findMany({
            where: cutoff
                ? and(eq(messages.channelId, channelId), isNull(messages.deletedAt), lt(messages.createdAt, cutoff))
                : and(eq(messages.channelId, channelId), isNull(messages.deletedAt)),
            orderBy: [desc(messages.createdAt)],
            limit: Math.min(Math.max(limit, 1), 100),
            with: { sender: true, receipts: true },
        });
        return rows.reverse();
    }
    async softDelete(messageId, userId) {
        const [deleted] = await db
            .update(messages)
            .set({ deletedAt: new Date(), content: '', attachmentUrl: null, updatedAt: new Date() })
            .where(and(eq(messages.id, messageId), eq(messages.senderId, userId)))
            .returning();
        return deleted ?? null;
    }
    async saveReceipt(payload, userId) {
        const [receipt] = await db
            .insert(messageReceipts)
            .values({ messageId: payload.messageId, userId, status: payload.status })
            .returning();
        return receipt;
    }
}
export const messageService = new MessageService();
