import type { Server } from 'socket.io';
import type { types as mediasoupTypes } from 'mediasoup';
import { randomUUID } from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';

import { roomService } from './room.service.js';
import { publisherService } from './publisher.service.js';
import { transcriptionService } from './transcription.service.js';
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
    const userName = socket.user?.name || `User ${userId.substring(0, 4)}`;
    const peerId = socket.id;

    const room = await roomService.getOrCreateRoom(roomId);

    // If an older device with the same userId is already in the room, disconnect the older device cleanly
    const existingUserPeers = roomService.getPeersByUserId(roomId, userId);
    for (const oldPeer of existingUserPeers) {
      if (oldPeer.socketId !== socket.id) {
        console.log(`⚠️ [Signal] User ${userId} joined from a new device (${socket.id}). Disconnecting older device (${oldPeer.socketId})...`);
        
        io.to(oldPeer.socketId).emit('disconnected-duplicate', {
          message: 'You were disconnected because this account joined the meeting from another device or window.',
        });

        const oldSocket = io.sockets.sockets.get(oldPeer.socketId);
        if (oldSocket) {
          oldSocket.data.isDuplicateKicked = true;
          oldSocket.leave(roomId);
        }

        io.in(oldPeer.socketId).disconnectSockets(true);
        roomService.removePeer(roomId, oldPeer.id, true);
        socket.to(roomId).emit('peer-left', { peerId: oldPeer.id, userId: oldPeer.userId });
      }
    }

    // If this specific socket was already registered, remove old peer
    if (roomService.getPeer(roomId, peerId)) {
      roomService.removePeer(roomId, peerId);
    }

    roomService.addPeer(roomId, peerId, userId, socket.id, userName);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.peerId = peerId;

    const existingProducers = roomService.getAllProducersInRoom(roomId, peerId);

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

    // Insert participant if this user hasn't joined this meeting yet
    const existingParticipant = await db.query.meetingParticipants.findFirst({
      where: and(
        eq(meetingParticipants.meetingId, activeMeeting.id),
        eq(meetingParticipants.userId, userId),
        isNull(meetingParticipants.leftAt)
      ),
    });

    if (!existingParticipant) {
      await db.insert(meetingParticipants).values({
        id: randomUUID(),
        meetingId: activeMeeting.id,
        userId,
        joinedAt: new Date(),
      });
    }

    await publisherService.publish('peer.joined', {
      meetingId: activeMeeting.id,
      userId,
    });

    const existingPeersList = Array.from(room.peers.entries())
      .filter(([pId]) => pId !== peerId)
      .map(([pId, peerObj]) => ({
        peerId: pId,
        userId: peerObj.userId,
        userName: peerObj.userName || `User ${peerObj.userId.substring(0, 4)}`,
      }));

    socket.to(roomId).emit('peer-joined', { peerId, userId, userName });
    const activeTx = transcriptionService.getActive(roomId);
    socket.emit('room-joined', {
      existingProducers,
      existingPeers: existingPeersList,
      transcription: activeTx
        ? {
            isTranscribing: true,
            capturerUserId: activeTx.capturerUserId,
            capturerName: activeTx.capturerName,
            noteId: activeTx.noteId,
          }
        : { isTranscribing: false },
    });
    console.log(
      `✅ [Signal] ${userId} (${peerId}) joined room "${roomId}" — ${room.peers.size} peers, ${existingProducers.length} existing producers`
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

  async handleSetRtpCapabilities(
    io: Server,
    socket: AuthSocket,
    data: { roomId: string; rtpCapabilities: mediasoupTypes.RtpCapabilities }
  ): Promise<void> {
    const room = roomService.getRoom(data.roomId);
    const peer = roomService.getPeer(data.roomId, socket.id);
    if (!room || !peer) {
      socket.emit('sfu-error', { message: 'Peer not in room', code: 'PEER_NOT_FOUND' });
      return;
    }
    peer.rtpCapabilities = data.rtpCapabilities;

    // If recvTransport already exists, push existing producers now!
    if (peer.recvTransport) {
      await this._pushExistingConsumers(io, socket, room, peer, data.roomId);
    }
  },

  async handleCreateSendTransport(
    socket: AuthSocket,
    data: { roomId: string }
  ): Promise<void> {
    const room = roomService.getRoom(data.roomId);
    const peer = roomService.getPeer(data.roomId, socket.id);
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
    const peer = roomService.getPeer(data.roomId, socket.id);
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
      await this._pushExistingConsumers(io, socket, room, peer, data.roomId);
    }
  },

  async _pushExistingConsumers(
    io: Server,
    socket: AuthSocket,
    room: Room,
    peer: Peer,
    roomId: string
  ): Promise<void> {
    const existing = roomService.getAllProducersInRoom(roomId, peer.id);

    for (const { peerId: producerPeerId, userId: producerUserId, userName: producerUserName, producerId } of existing) {
      const producerPeer = roomService.getPeer(roomId, producerPeerId);
      const producer = producerPeer?.producers.get(producerId);
      if (!producer || producer.closed) continue;

      // Avoid creating duplicate consumers for the same producer
      const alreadyConsuming = Array.from(peer.consumers.values()).some(
        (c) => c.producerId === producer.id && !c.closed
      );
      if (alreadyConsuming) continue;

      const consumer = await createConsumer(
        room.router,
        peer.recvTransport!,
        producer,
        peer.rtpCapabilities!
      );
      if (!consumer) continue;

      peer.consumers.set(consumer.id, consumer);

      const capturedPeer = peer;
      const capturedConsumer = consumer;
      capturedConsumer.on('transportclose', () => {
        capturedPeer.consumers.delete(capturedConsumer.id);
      });
      capturedConsumer.on('producerclose', () => {
        capturedPeer.consumers.delete(capturedConsumer.id);
        socket.emit('consumer-closed', { consumerId: capturedConsumer.id });
      });

      socket.emit('consume', {
        consumerId: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        peerId: producerPeerId,
        userId: producerUserId,
        userName: producerUserName || `User ${producerUserId.substring(0, 4)}`,
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
    const peer = roomService.getPeer(data.roomId, socket.id);
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

    try {
      await transport.connect({ dtlsParameters: data.dtlsParameters });
    } catch (err: any) {
      if (err.message?.includes('already called')) return;
      throw err;
    }
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
  ): Promise<string | undefined> {
    const { roomId, kind, rtpParameters, appData } = data;
    const peerId = socket.id;
    const room = roomService.getRoom(roomId);
    const peer = roomService.getPeer(roomId, peerId);

    if (!room || !peer?.sendTransport) {
      socket.emit('sfu-error', {
        message: 'Cannot produce: send transport not initialised',
        code: 'NO_SEND_TRANSPORT',
      });
      return undefined;
    }

    const producer = await peer.sendTransport.produce({
      kind,
      rtpParameters,
      appData: appData ?? {},
    });
    peer.producers.set(producer.id, producer);

    if (kind === 'video') {
      console.log(
        `🎥 [Meet:SFU] Video feed turned ON — User ID: "${peer.userId}" (name: "${peer.userName || 'Unknown'}", socketId: ${socket.id}, producerId: ${producer.id}, mime: ${producer.rtpParameters.codecs[0]?.mimeType || 'unknown'}) in room "${roomId}"`
      );
    } else if (kind === 'audio') {
      console.log(
        `🎙️ [Meet:SFU] Audio feed turned ON — User ID: "${peer.userId}" (name: "${peer.userName || 'Unknown'}", socketId: ${socket.id}, producerId: ${producer.id}) in room "${roomId}"`
      );
    }

    producer.on('transportclose', () => {
      if (kind === 'video') {
        console.log(
          `⏹️ [Meet:SFU] Video feed turned OFF — User ID: "${peer.userId}" in room "${roomId}" (producerId: ${producer.id})`
        );
      }
      peer.producers.delete(producer.id);
    });

    socket.emit('produced', { producerId: producer.id });
    socket.to(roomId).emit('new-producer', {
      peerId,
      userId: peer.userId,
      producerId: producer.id,
      kind,
    });

    for (const [otherPeerId, otherPeer] of room.peers) {
      if (otherPeerId === peerId) continue;
      if (!otherPeer.recvTransport || !otherPeer.rtpCapabilities) continue;

      const alreadyConsuming = Array.from(otherPeer.consumers.values()).some(
        (c) => c.producerId === producer.id && !c.closed
      );
      if (alreadyConsuming) continue;

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
        io.to(capturedPeer.socketId).emit('consumer-closed', { consumerId: capturedConsumer.id });
      });

      io.to(otherPeer.socketId).emit('consume', {
        consumerId: consumer.id,
        producerId: producer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        peerId,
        userId: peer.userId,
        userName: peer.userName || `User ${peer.userId.substring(0, 4)}`,
      });
    }

    return producer.id;
  },

  async handleResumeConsumer(
    socket: AuthSocket,
    data: { roomId: string; consumerId: string }
  ): Promise<void> {
    const peer = roomService.getPeer(data.roomId, socket.id);
    if (!peer) return;

    const consumer = peer.consumers.get(data.consumerId);
    if (!consumer || consumer.closed) return;

    await consumer.resume();
    if (consumer.kind === 'video') {
      try {
        await consumer.requestKeyFrame();
      } catch (err) {
        console.warn(`[Signal] Failed to request keyframe for consumer ${consumer.id}:`, err);
      }
      setTimeout(async () => {
        try {
          if (!consumer.closed) await consumer.requestKeyFrame();
        } catch (_) {}
      }, 600);
    }
  },

  async handleLeaveRoom(
    io: Server,
    socket: AuthSocket,
    data: { roomId: string }
  ): Promise<void> {
    await this._cleanupPeer(io, socket, data.roomId, socket.id);
  },

  async handleDisconnect(io: Server, socket: AuthSocket): Promise<void> {
    if (socket.data.isDuplicateKicked) {
      console.log(`[Signal] Ignoring disconnect for duplicate-kicked socket ${socket.id}`);
      return;
    }
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) return;
    await this._cleanupPeer(io, socket, roomId, socket.id);
  },

  async _cleanupPeer(
    io: Server,
    socket: AuthSocket,
    roomId: string,
    peerId: string
  ): Promise<void> {
    const peer = roomService.getPeer(roomId, peerId);
    if (!peer) return;

    const producerIds = Array.from(peer.producers.keys());
    const userId = peer.userId;

    socket.to(roomId).emit('peer-left', { peerId, userId, producerIds });

    roomService.removePeer(roomId, peerId);
    socket.leave(roomId);
    socket.data.roomId = undefined;
    socket.data.peerId = undefined;

    try {
      if (!roomService.hasUserInRoom(roomId, userId)) {
        await db
          .update(meetingParticipants)
          .set({ leftAt: new Date() })
          .where(
            and(
              eq(meetingParticipants.userId, userId),
              isNull(meetingParticipants.leftAt)
            )
          );
      }

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

      await publisherService.publish('peer.left', { peerId, userId, roomId });
    } catch (err) {
      console.error(`[Signal] DB cleanup error for peer ${peerId} (user ${userId}):`, err);
    }

    console.log(`👋 [Signal] Peer ${peerId} (user ${userId}) left room "${roomId}"`);
  },
};
