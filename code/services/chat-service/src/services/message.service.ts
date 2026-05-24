import { db } from '../db/client.js';
import { messages, messageReceipts } from '../models/message.model.js';
import { MessagePayload, ReceiptPayload } from '../ws/types.js';

export class MessageService {
  async saveMessage(payload: MessagePayload, senderId: string) {
    console.log(`💾 [MessageService] Saving message to channel ${payload.channelId} from user ${senderId}`);
    const [message] = await db.insert(messages).values({
      channelId: payload.channelId,
      senderId,
      content: payload.content,
    }).returning();
    console.log(`✅ [MessageService] Message saved with ID: ${message.id}`);
    return message;
  }

  async saveReceipt(payload: ReceiptPayload, userId: string) {
    console.log(`💾 [MessageService] Saving receipt for message ${payload.messageId} from user ${userId}`);
    const [receipt] = await db.insert(messageReceipts).values({
      messageId: payload.messageId,
      userId,
      status: payload.status,
    }).returning();
    console.log(`✅ [MessageService] Receipt saved`);
    return receipt;
  }
}

export const messageService = new MessageService();
