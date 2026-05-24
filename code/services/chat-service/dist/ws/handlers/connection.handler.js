import { presenceStore } from '../store/presence.store.js';
import { SocketEvents } from '../types.js';
import { registerMessageHandlers } from './message.handler.js';
import { registerTypingHandlers } from './typing.handler.js';
import { registerReceiptHandlers } from './receipt.handler.js';
import { socketConnectionsTotal } from '../../monitoring/metrics.js';
export const handleConnection = async (io, socket) => {
    const userId = socket.user?.id;
    if (!userId)
        return socket.disconnect();
    console.log(`User connected: ${userId} (${socket.id})`);
    // Increment connection metric
    socketConnectionsTotal.inc();
    // Set user online
    await presenceStore.setUserOnline(userId, socket.id);
    // Broadcast presence to others (simplified for now)
    socket.broadcast.emit('user_presence', { userId, status: 'online' });
    // Register feature handlers
    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerReceiptHandlers(io, socket);
    socket.on(SocketEvents.DISCONNECT, async () => {
        console.log(`🔌 [WS:Connection] User disconnected: ${userId} (${socket.id})`);
        await presenceStore.setUserOffline(userId);
        socket.broadcast.emit('user_presence', { userId, status: 'offline' });
    });
    socket.on(SocketEvents.JOIN_ROOM, (channelId) => {
        console.log(`🏠 [WS:Room] User ${userId} attempting to join room: ${channelId}`);
        socket.join(channelId);
        console.log(`✅ [WS:Room] User ${userId} joined room: ${channelId}`);
    });
    socket.on(SocketEvents.LEAVE_ROOM, (channelId) => {
        console.log(`🏃 [WS:Room] User ${userId} leaving room: ${channelId}`);
        socket.leave(channelId);
        console.log(`✅ [WS:Room] User ${userId} left room: ${channelId}`);
    });
};
