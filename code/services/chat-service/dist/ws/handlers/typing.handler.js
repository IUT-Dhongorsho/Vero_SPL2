import { SocketEvents } from '../types.js';
export const registerTypingHandlers = (io, socket) => {
    socket.on(SocketEvents.TYPING, (payload) => {
        console.log(`⌨️ [WS:Typing] ${socket.user?.id} is ${payload.isTyping ? 'typing' : 'not typing'} in channel ${payload.channelId}`);
        const userId = socket.user.id;
        // Broadcast to others in the channel
        socket.to(payload.channelId).emit(SocketEvents.TYPING, {
            userId,
            isTyping: payload.isTyping,
            channelId: payload.channelId,
        });
    });
};
