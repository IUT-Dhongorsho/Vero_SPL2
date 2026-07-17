import type { Server } from 'socket.io';
import type { types as mediasoupTypes } from 'mediasoup';
import { randomUUID } from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';

import { roomService } from './room.service.js';
import { publisherService } from './publisher.service.js';
import { createWebRtcTransport } from '../sfu/transport.js';
import { createConsumer } from '../sfu/producer-consumer.js';
import { db } from '../db/client.js';
import { meetings, meetingParticipants } from '../models/meeting.model.js';
import { env } from '../config/env.js';
import type { AuthSocket } from '../ws/ws-server.js';
import type { Room, Peer } from '../models/peer.model.js';

interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

function buildIceServers(): IceServer[] {
  const servers: IceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
  ];
  if (env.TURN_SERVER_URL) {
    servers.push({
      urls: env.TURN_SERVER_URL,
      username: env.TURN_USERNAME,
      credential: env.TURN_PASSWORD,
    });
  }
  return servers;
}

export const signalService = {
  async handleJoin(
    io: Server,
    socket: AuthSocket,
    data: { roomId: string }
  ): Promise<void> {
    const { roomId } = data;
    const userId = socket.user!.id;

    const room = await roomService.getOrCreateRoom(roomId);

    if (roomService.getPeer(roomId, userId)) {
      roomService.removePeer(roomId, userId);
    }

    roomService.addPeer(roomId, userId, socket.id);
    socket.join(roomId);
    socket.data.roomId = roomId;

    const existingProducers = roomService.getAllProducersInRoom(roomId, userId);

    let activeMeeting = await db.query.meetings.findFirst({
      where: and(eq(meetings.roomId, roomId), isNull(meetings.endedAt)),
    });

    if (!activeMeeting) {
      const [created] = await db
        .insert(meetings)
        .values({
          id: randomUUID(),
          roomId,
          startedBy: userId,
          startedAt: new Date(),
          status: 'active',
        })
        .returning();
      activeMeeting = created;

      await publisherService.publish('meeting.started', {
        meetingId: activeMeeting.id,
        roomId,
        startedBy: userId,
        startedAt: activeMeeting.startedAt.toISOString(),
      });
    }

    await db.insert(meetingParticipants).values({
      id: randomUUID(),
      meetingId: activeMeeting.id,
      userId,
      joinedAt: new Date(),
    });

    await publisherService.publish('peer.joined', {
      meetingId: activeMeeting.id,
      userId,
    });

    socket.to(roomId).emit('peer-joined', { userId });
    socket.emit('room-joined', { existingProducers });
    console.log(
      `✅ [Signal] ${userId} joined room "${roomId}" — ${room.peers.size} peers, ${existingProducers.length} existing producers`
    );
  },

  handleGetRtpCapabilities(
    socket: AuthSocket,
    data: { roomId: string }
  ): void {
    const room = roomService.getRoom(data.roomId);
    if (!room) {
      socket.emit('sfu-error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
      return;
    }
    socket.emit('rtp-capabilities', { rtpCapabilities: room.router.rtpCapabilities });
  },

  handleSetRtpCapabilities(
    socket: AuthSocket,
    data: { roomId: string; rtpCapabilities: mediasoupTypes.RtpCapabilities }
  ): void {
    const peer = roomService.getPeer(data.roomId, socket.user!.id);
    if (!peer) {
      socket.emit('sfu-error', { message: 'Peer not in room', code: 'PEER_NOT_FOUND' });
      return;
    }
    peer.rtpCapabilities = data.rtpCapabilities;
  },

  async handleCreateSendTransport(
    socket: AuthSocket,
    data: { roomId: string }
  ): Promise<void> {
    const room = roomService.getRoom(data.roomId);
    const peer = roomService.getPeer(data.roomId, socket.user!.id);
    if (!room || !peer) {
      socket.emit('sfu-error', { message: 'Room or peer not found', code: 'STATE_ERROR' });
      return;
    }

    const transport = await createWebRtcTransport(room.router);
    peer.sendTransport = transport;

    transport.on('dtlsstatechange', (state) => {
      if (state === 'closed') peer.sendTransport = null;
    });

    socket.emit('send-transport-created', {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      iceServers: buildIceServers(),
    });
  },

  async handleCreateRecvTransport(
    io: Server,
    socket: AuthSocket,
    data: { roomId: string }
  ): Promise<void> {
    const room = roomService.getRoom(data.roomId);
    const peer = roomService.getPeer(data.roomId, socket.user!.id);
    if (!room || !peer) {
      socket.emit('sfu-error', { message: 'Room or peer not found', code: 'STATE_ERROR' });
      return;
    }

    const transport = await createWebRtcTransport(room.router);
    peer.recvTransport = transport;

    transport.on('dtlsstatechange', (state) => {
      if (state === 'closed') peer.recvTransport = null;
    });

    socket.emit('recv-transport-created', {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      iceServers: buildIceServers(),
    });

    if (peer.rtpCapabilities) {
      await this._pushExistingConsumers(socket, room, peer, data.roomId);
    }
  },

  async _pushExistingConsumers(
    socket: AuthSocket,
    room: Room,
    peer: Peer,
    roomId: string
  ): Promise<void> {
    const existing = roomService.getAllProducersInRoom(roomId, socket.user!.id);

    for (const { userId: producerUserId, producerId } of existing) {
      const producerPeer = roomService.getPeer(roomId, producerUserId);
      const producer = producerPeer?.producers.get(producerId);
      if (!producer || producer.closed) continue;

      const consumer = await createConsumer(
        room.router,
        peer.recvTransport!,
        producer,
        peer.rtpCapabilities!
      );
      if (!consumer) continue;

      peer.consumers.set(consumer.id, consumer);

      consumer.on('transportclose', () => {
        peer.consumers.delete(consumer.id);
      });
      consumer.on('producerclose', () => {
        peer.consumers.delete(consumer.id);
        socket.emit('consumer-closed', { consumerId: consumer.id });
      });

      socket.emit('consume', {
        consumerId: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        userId: producerUserId,
      });
    }
  },

  async handleConnectTransport(
    socket: AuthSocket,
    data: {
      roomId: string;
      transportId: string;
      dtlsParameters: mediasoupTypes.DtlsParameters;
    }
  ): Promise<void> {
    const peer = roomService.getPeer(data.roomId, socket.user!.id);
    if (!peer) {
      socket.emit('sfu-error', { message: 'Peer not found', code: 'PEER_NOT_FOUND' });
      return;
    }

    let transport: mediasoupTypes.WebRtcTransport | null = null;
    if (peer.sendTransport?.id === data.transportId) transport = peer.sendTransport;
    else if (peer.recvTransport?.id === data.transportId) transport = peer.recvTransport;

    if (!transport) {
      socket.emit('sfu-error', {
        message: 'Transport not found',
        code: 'TRANSPORT_NOT_FOUND',
      });
      return;
    }

    await transport.connect({ dtlsParameters: data.dtlsParameters });
  },

  async handleProduce(
    io: Server,
    socket: AuthSocket,
    data: {
      roomId: string;
      kind: mediasoupTypes.MediaKind;
      rtpParameters: mediasoupTypes.RtpParameters;
      appData?: Record<string, unknown>;
    }
  ): Promise<void> {
    const { roomId, kind, rtpParameters, appData } = data;
    const userId = socket.user!.id;
    const room = roomService.getRoom(roomId);
    const peer = roomService.getPeer(roomId, userId);

    if (!room || !peer?.sendTransport) {
      socket.emit('sfu-error', {
        message: 'Cannot produce: send transport not initialised',
        code: 'NO_SEND_TRANSPORT',
      });
      return;
    }

    const producer = await peer.sendTransport.produce({
      kind,
      rtpParameters,
      appData: appData ?? {},
    });
    peer.producers.set(producer.id, producer);

    producer.on('transportclose', () => {
      peer.producers.delete(producer.id);
    });

    socket.emit('produced', { producerId: producer.id });
    socket.to(roomId).emit('new-producer', { userId, producerId: producer.id, kind });

    for (const [otherUserId, otherPeer] of room.peers) {
      if (otherUserId === userId) continue;
      if (!otherPeer.recvTransport || !otherPeer.rtpCapabilities) continue;

      const consumer = await createConsumer(
        room.router,
        otherPeer.recvTransport,
        producer,
        otherPeer.rtpCapabilities
      );
      if (!consumer) continue;

      otherPeer.consumers.set(consumer.id, consumer);

      const capturedPeer = otherPeer;
      const capturedConsumer = consumer;
      capturedConsumer.on('transportclose', () => {
        capturedPeer.consumers.delete(capturedConsumer.id);
      });
      capturedConsumer.on('producerclose', () => {
        capturedPeer.consumers.delete(capturedConsumer.id);
        const otherSocket = io.sockets.sockets.get(capturedPeer.socketId);
        otherSocket?.emit('consumer-closed', { consumerId: capturedConsumer.id });
      });

      const otherSocket = io.sockets.sockets.get(otherPeer.socketId);
      otherSocket?.emit('consume', {
        consumerId: consumer.id,
        producerId: producer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        userId,
      });
    }
  },

  async handleResumeConsumer(
    socket: AuthSocket,
    data: { roomId: string; consumerId: string }
  ): Promise<void> {
    const peer = roomService.getPeer(data.roomId, socket.user!.id);
    if (!peer) return;

    const consumer = peer.consumers.get(data.consumerId);
    if (!consumer || consumer.closed) return;

    await consumer.resume();
  },

  async handleLeaveRoom(
    io: Server,
    socket: AuthSocket,
    data: { roomId: string }
  ): Promise<void> {
    await this._cleanupPeer(io, socket, data.roomId, socket.user!.id);
  },

  async handleDisconnect(io: Server, socket: AuthSocket): Promise<void> {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId || !socket.user) return;
    await this._cleanupPeer(io, socket, roomId, socket.user.id);
  },

  async _cleanupPeer(
    io: Server,
    socket: AuthSocket,
    roomId: string,
    userId: string
  ): Promise<void> {
    const peer = roomService.getPeer(roomId, userId);
    if (!peer) return;

    const producerIds = Array.from(peer.producers.keys());

    socket.to(roomId).emit('peer-left', { userId, producerIds });

    roomService.removePeer(roomId, userId);
    socket.leave(roomId);
    socket.data.roomId = undefined;

    try {
      await db
        .update(meetingParticipants)
        .set({ leftAt: new Date() })
        .where(
          and(
            eq(meetingParticipants.userId, userId),
            isNull(meetingParticipants.leftAt)
          )
        );

      if (!roomService.getRoom(roomId)) {
        const activeMeeting = await db.query.meetings.findFirst({
          where: and(eq(meetings.roomId, roomId), isNull(meetings.endedAt)),
        });

        if (activeMeeting) {
          await db
            .update(meetings)
            .set({ endedAt: new Date(), status: 'ended' })
            .where(eq(meetings.id, activeMeeting.id));

          await publisherService.publish('meeting.ended', {
            meetingId: activeMeeting.id,
            roomId,
            endedAt: new Date().toISOString(),
          });

          console.log(`🏁 [Signal] Meeting ${activeMeeting.id} ended — room "${roomId}" is empty`);
        }
      }

      await publisherService.publish('peer.left', { userId, roomId });
    } catch (err) {
      console.error(`[Signal] DB cleanup error for user ${userId}:`, err);
    }

    console.log(`👋 [Signal] User ${userId} left room "${roomId}"`);
  },
};
