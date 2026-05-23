import { SocketEvents } from '../types.js';
import { messageService } from '../../services/message.service.js';
import { channelService } from '../../services/channel.service.js';
import { messagesSentTotal } from '../../monitoring/metrics.js';
export const registerMessageHandlers = (io, socket) => {
    socket.on(SocketEvents.MESSAGE, async (payload) => {
        try {
            const userId = socket.user.id;
            // 1. Authorization check
            const isMember = await channelService.isMember(payload.channelId, userId);
            if (!isMember) {
                return socket.emit(SocketEvents.ERROR, { message: 'Not a member of this channel' });
            }
            // 2. Persist first
            const savedMessage = await messageService.saveMessage(payload, userId);
            // Increment metric
            messagesSentTotal.inc();
            // 3. Broadcast
            io.to(payload.channelId).emit(SocketEvents.MESSAGE, savedMessage);
        }
        catch (error) {
            console.error('Error handling message:', error);
            socket.emit(SocketEvents.ERROR, { message: 'Failed to send message' });
        }
    });
};
