import { Server } from 'socket.io';
import { notificationsDeliveredTotal } from '../../monitoring/metrics.js';

export class SocketDelivery {
  private io: Server | null = null;

  init(io: Server) {
    this.io = io;
    console.log('🔌 Socket Delivery initialized');
  }

  async deliver(userId: string, payload: any) {
    if (!this.io) {
      console.warn('⚠️ Socket.io server not initialized for delivery');
      return false;
    }

    // Emit to the user's specific room
    this.io.to(`user:${userId}`).emit('notification', payload);
    notificationsDeliveredTotal.inc({ channel: 'socket', result: 'sent' });
    console.log(`🚀 Notification delivered via Socket to user: ${userId}`);
    return true;
  }
}

export const socketDelivery = new SocketDelivery();
