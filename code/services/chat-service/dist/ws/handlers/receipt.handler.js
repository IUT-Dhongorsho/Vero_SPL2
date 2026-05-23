import { SocketEvents } from '../types.js';
import { messageService } from '../../services/message.service.js';
export const registerReceiptHandlers = (io, socket) => {
    socket.on(SocketEvents.RECEIPT, async (payload) => {
        try {
            const userId = socket.user.id;
            // 1. Persist first
            const savedReceipt = await messageService.saveReceipt(payload, userId);
            // 2. Broadcast to the channel
            io.to(payload.channelId).emit(SocketEvents.RECEIPT, savedReceipt);
        }
        catch (error) {
            console.error('Error handling receipt:', error);
        }
    });
};
