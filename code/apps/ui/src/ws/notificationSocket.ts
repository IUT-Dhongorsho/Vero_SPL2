import { io, Socket } from 'socket.io-client';
import { API_ORIGIN, socketPath } from '../lib/endpoints';

let socket: Socket | null = null;

export const connectNotificationSocket = (
  userId: string,
  onNotificationReceived: (notification: any) => void
): Socket | null => {
  if (socket) return socket;

  try {
    socket = io(API_ORIGIN, {
      path: socketPath('notifications'),
      query: { userId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 2,
      reconnectionDelay: 5000,
      timeout: 5000,
    });

    socket.on('connect', () => {
      console.log('📡 [WS] Notification socket connected');
    });

    socket.on('notification', (data) => {
      onNotificationReceived(data);
    });

    // Suppress noisy errors — notification service may not have socket.io ready
    socket.on('connect_error', () => {});
    socket.on('disconnect', () => {});

    return socket;
  } catch {
    return null;
  }
};

export const disconnectNotificationSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
