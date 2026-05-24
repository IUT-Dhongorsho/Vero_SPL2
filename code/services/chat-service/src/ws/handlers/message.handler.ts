import { Server } from 'socket.io';
import { AuthSocket } from '../middlewares/auth.middleware.js';
import { SocketEvents, MessagePayload } from '../types.js';
import { messageService } from '../../services/message.service.js';
import { channelService } from '../../services/channel.service.js';
import { messagesSentTotal } from '../../monitoring/metrics.js';

export const registerMessageHandlers = (io: Server, socket: AuthSocket) => {
  socket.on(SocketEvents.MESSAGE, async (payload: MessagePayload) => {
    console.log(`📩 [WS:Message] Received message event from ${socket.user?.id} for channel ${payload.channelId}`);
    try {
      const userId = socket.user!.id;

      // 1. Authorization check
      const isMember = await channelService.isMember(payload.channelId, userId);
      if (!isMember) {
        console.warn(`🚫 [WS:Message] User ${userId} is NOT a member of channel ${payload.channelId}`);
        return socket.emit(SocketEvents.ERROR, { message: 'Not a member of this channel' });
      }

      console.log(`✅ [WS:Message] User ${userId} authorized for channel ${payload.channelId}`);

      // 2. Persist first
      const savedMessage = await messageService.saveMessage(payload, userId);
      console.log(`💾 [WS:Message] Message persisted to DB with ID: ${savedMessage.id}`);

      // Increment metric
      messagesSentTotal.inc();

      // 3. Broadcast
      console.log(`📡 [WS:Message] Broadcasting message to room: ${payload.channelId}`);
      io.to(payload.channelId).emit(SocketEvents.MESSAGE, savedMessage);
      console.log(`✅ [WS:Message] Broadcast complete`);
    } catch (error) {
      console.error('❌ [WS:Message] Error handling message:', error);
      socket.emit(SocketEvents.ERROR, { message: 'Failed to send message' });
    }
  });
};
