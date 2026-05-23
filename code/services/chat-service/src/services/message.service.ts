import { db } from '../db/client.js';
import { messages, messageReceipts } from '../models/message.model.js';
import { MessagePayload, ReceiptPayload } from '../ws/types.js';

export class MessageService {
  async saveMessage(payload: MessagePayload, senderId: string) {
    const [message] = await db.insert(messages).values({
      channelId: payload.channelId,
      senderId,
      content: payload.content,
    }).returning();
    return message;
  }

  async saveReceipt(payload: ReceiptPayload, userId: string) {
    const [receipt] = await db.insert(messageReceipts).values({
      messageId: payload.messageId,
      userId,
      status: payload.status,
    }).returning();
    return receipt;
  }
}

export const messageService = new MessageService();
