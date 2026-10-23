import type { Server } from 'socket.io';
import type { AuthSocket } from './ws-server.js';
import { signalService } from '../services/signal.service.js';

export function registerSignalHandlers(io: Server, socket: AuthSocket): void {
  const wrap = (handler: () => Promise<void>) => {
    handler().catch((err) => {
      console.error(`[Meet:MessageRouter] Unhandled error in handler:`, err);
      socket.emit('sfu-error', {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });
  };

  socket.on('join-room', (data) =>
    wrap(() => signalService.handleJoin(io, socket, data))
  );
  socket.on('get-rtp-capabilities', (data) => {
    signalService.handleGetRtpCapabilities(socket, data);
  });
  socket.on('set-rtp-capabilities', (data) =>
    wrap(() => signalService.handleSetRtpCapabilities(io, socket, data))
  );

  socket.on('create-send-transport', (data) =>
    wrap(() => signalService.handleCreateSendTransport(socket, data))
  );
  socket.on('create-recv-transport', (data) =>
    wrap(() => signalService.handleCreateRecvTransport(io, socket, data))
  );
  socket.on('connect-transport', (data, callback) =>
    wrap(async () => {
      await signalService.handleConnectTransport(socket, data);
      if (typeof callback === 'function') {
        callback({ connected: true });
      }
    })
  );

  socket.on('produce', (data, callback) =>
    wrap(async () => {
      const producerId = await signalService.handleProduce(io, socket, data);
      if (typeof callback === 'function') {
        callback({ id: producerId });
      }
    })
  );
  socket.on('resume-consumer', (data) =>
    wrap(() => signalService.handleResumeConsumer(socket, data))
  );

  socket.on('leave-room', (data) =>
    wrap(() => signalService.handleLeaveRoom(io, socket, data))
  );
  socket.on('disconnect', () =>
    wrap(() => signalService.handleDisconnect(io, socket))
  );
}
