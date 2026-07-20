import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Connects to the notification WebSocket namespace using socket.io.
 * Registers event listener callbacks for real-time notification push events.
 */
export const connectNotificationSocket = (
  userId: string,
  onNotificationReceived: (notification: any) => void
): Socket => {
  if (socket) {
    return socket;
  }

  // Socket.io needs the server origin only — NOT the /api path prefix.
  // The path option below tells socket.io where the endpoint is on the server.
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  const wsUrl = apiUrl.replace(/\/api$/, ''); // strips trailing /api → http://localhost:8080

  console.log(`🔌 [WS] Connecting to Notification Server: ${wsUrl} for user: ${userId}`);

  socket = io(wsUrl, {
    path: '/api/notifications/socket.io/',
    query: { userId },
    transports: ['websocket'],
    reconnectionAttempts: 3,
    reconnectionDelay: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('📡 [WS] Notification socket successfully connected.');
  });

  socket.on('notification', (data) => {
    console.log('🔔 [WS] Real-time notification packet received:', data);
    onNotificationReceived(data);
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 [WS] Notification socket disconnected. Reason: ${reason}`);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ [WS] Connection error on notification socket:', error.message);
  });

  return socket;
};

/**
 * Disconnects the active notification socket connection and cleans up references.
 */
export const disconnectNotificationSocket = (): void => {
  if (socket) {
    console.log('🔌 [WS] Closing notification socket connection...');
    socket.disconnect();
    socket = null;
  }
};
