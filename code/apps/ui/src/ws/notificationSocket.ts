import { io, Socket } from 'socket.io-client';
import { API_ORIGIN, socketPath } from '../lib/endpoints';
import { useAuthStore } from '../stores/auth.store';

let socket: Socket | null = null;

/** Live notifications for the signed-in user; the server derives who that is from the token. */
export const connectNotificationSocket = (onNotificationReceived: (notification: any) => void): Socket | null => {
  if (socket) return socket;
  const token = useAuthStore.getState().token;
  if (!token) return null;

  socket = io(API_ORIGIN, {
    path: socketPath('notifications'),
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30_000,
  });

  socket.on('notification', onNotificationReceived);
  socket.on('connect_error', (error) => console.warn('[notifications] socket:', error.message));

  return socket;
};

export const disconnectNotificationSocket = (): void => {
  socket?.disconnect();
  socket = null;
};
