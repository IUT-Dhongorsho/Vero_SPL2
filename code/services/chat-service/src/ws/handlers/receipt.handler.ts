import { Server } from 'socket.io';
import { AuthSocket } from '../middlewares/auth.middleware.js';
import { SocketEvents, ReceiptPayload } from '../types.js';
import { messageService } from '../../services/message.service.js';

export const registerReceiptHandlers = (io: Server, socket: AuthSocket) => {
  socket.on(SocketEvents.RECEIPT, async (payload: ReceiptPayload) => {
    console.log(`🧾 [WS:Receipt] Received receipt from ${socket.user?.id} for message ${payload.messageId} in channel ${payload.channelId}`);
    try {
      const userId = socket.user!.id;

      // 1. Persist first
      const savedReceipt = await messageService.saveReceipt(payload, userId);
      console.log(`💾 [WS:Receipt] Receipt persisted to DB`);

      // 2. Broadcast to the channel
      console.log(`📡 [WS:Receipt] Broadcasting receipt to room: ${payload.channelId}`);
      io.to(payload.channelId).emit(SocketEvents.RECEIPT, savedReceipt);
      console.log(`✅ [WS:Receipt] Broadcast complete`);
    } catch (error) {
      console.error('❌ [WS:Receipt] Error handling receipt:', error);
    }
  });
};
