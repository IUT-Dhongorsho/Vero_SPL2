import { Server } from 'socket.io';
import { AuthSocket } from '../middlewares/auth.middleware.js';
import { SocketEvents, ReceiptPayload } from '../types.js';
import { messageService } from '../../services/message.service.js';

export const registerReceiptHandlers = (io: Server, socket: AuthSocket) => {
  socket.on(SocketEvents.RECEIPT, async (payload: ReceiptPayload) => {
    try {
      const userId = socket.user!.id;

      // 1. Persist first
      const savedReceipt = await messageService.saveReceipt(payload, userId);

      // 2. Broadcast to the channel
      io.to(payload.channelId).emit(SocketEvents.RECEIPT, savedReceipt);
    } catch (error) {
      console.error('Error handling receipt:', error);
    }
  });
};
