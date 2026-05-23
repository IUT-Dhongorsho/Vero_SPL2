import { Server } from 'socket.io';
import { AuthSocket } from '../middlewares/auth.middleware.js';
import { SocketEvents, TypingPayload } from '../types.js';

export const registerTypingHandlers = (io: Server, socket: AuthSocket) => {
  socket.on(SocketEvents.TYPING, (payload: TypingPayload) => {
    const userId = socket.user!.id;
    // Broadcast to others in the channel
    socket.to(payload.channelId).emit(SocketEvents.TYPING, {
      userId,
      isTyping: payload.isTyping,
      channelId: payload.channelId,
    });
  });
};
