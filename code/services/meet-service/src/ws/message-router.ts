import type { Server } from 'socket.io';
import type { AuthSocket } from './ws-server.js';
import { signalService } from '../services/signal.service.js';
import { transcriptionService } from '../services/transcription.service.js';

export function registerSignalHandlers(io: Server, socket: AuthSocket): void {
  const wrap = (handler: () => Promise<void>) => {
    handler().catch((err) => {
      console.error(`[Meet:MessageRouter] Unhandled error in handler:`, err);
      socket.emit('sfu-error', {
        message: err.message || 'Internal server error',
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

  // ─── Transcription & Meeting Minutes Handlers ─────────────────
  socket.on('start-transcription', (data: { roomId: string; moduleId?: string }) =>
    wrap(async () => {
      const { roomId, moduleId } = data;
      try {
        const user = socket.user || { id: socket.id, name: 'Attendee' };
        const result = await transcriptionService.startTranscription(
          roomId,
          moduleId || roomId,
          user,
          socket.id
        );

        // Notify entire room that transcription started
        io.to(roomId).emit('transcription-started', {
          roomId,
          capturerUserId: result.capturerUserId,
          capturerName: result.capturerName,
          noteId: result.noteId,
        });
      } catch (err: any) {
        socket.emit('transcription-error', {
          message: err.message || 'Failed to start transcription',
        });
      }
    })
  );

  socket.on(
    'transcription-audio-chunk',
    (data: { roomId: string; chunk: ArrayBuffer | Buffer; speakerName?: string; timestamp?: string }) =>
      wrap(async () => {
        const { roomId, chunk, speakerName, timestamp } = data;
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        await transcriptionService.processAudioChunk(
          roomId,
          socket.id,
          buffer,
          speakerName || socket.user?.name,
          timestamp
        );
      })
  );

  socket.on('stop-transcription', (data: { roomId: string }) =>
    wrap(async () => {
      const { roomId } = data;
      const result = await transcriptionService.stopTranscription(roomId, socket.user);
      if (result) {
        io.to(roomId).emit('transcription-stopped', {
          roomId,
          noteId: result.noteId,
        });
      }
    })
  );

  socket.on('disconnect', () =>
    wrap(async () => {
      const stoppedRoomId = await transcriptionService.handleSocketDisconnect(socket.id);
      if (stoppedRoomId) {
        io.to(stoppedRoomId).emit('transcription-stopped', {
          roomId: stoppedRoomId,
          reason: 'capturer-disconnected',
        });
      }
      await signalService.handleDisconnect(io, socket);
    })
  );
}
