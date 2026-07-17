import type { Room, Peer } from '../models/peer.model.js';
import { createRouter } from '../sfu/router.js';
import { getNextWorker } from '../sfu/worker.js';
import {
  activeMeetingsGauge,
  activeParticipantsGauge,
} from '../monitoring/metrics.js';

const rooms = new Map<string, Room>();

export const roomService = {
  async getOrCreateRoom(roomId: string): Promise<Room> {
    if (rooms.has(roomId)) return rooms.get(roomId)!;

    const worker = getNextWorker();
    const router = await createRouter(worker);
    const room: Room = { id: roomId, router, peers: new Map() };
    rooms.set(roomId, room);

    activeMeetingsGauge.set(rooms.size);
    console.log(`✅ [Room] Created room "${roomId}" — total rooms: ${rooms.size}`);
    return room;
  },

  getRoom(roomId: string): Room | undefined {
    return rooms.get(roomId);
  },

  addPeer(roomId: string, userId: string, socketId: string): Peer {
    const room = rooms.get(roomId)!;
    const peer: Peer = {
      userId,
      socketId,
      rtpCapabilities: null,
      sendTransport: null,
      recvTransport: null,
      producers: new Map(),
      consumers: new Map(),
    };
    room.peers.set(userId, peer);
    activeParticipantsGauge.set(this._countAllPeers());
    return peer;
  },

  getPeer(roomId: string, userId: string): Peer | undefined {
    return rooms.get(roomId)?.peers.get(userId);
  },

  removePeer(roomId: string, userId: string): void {
    const room = rooms.get(roomId);
    if (!room) return;

    const peer = room.peers.get(userId);
    if (peer) {
      try { peer.sendTransport?.close(); } catch (_) { /* already closed */ }
      try { peer.recvTransport?.close(); } catch (_) { /* already closed */ }
      room.peers.delete(userId);
    }

    if (room.peers.size === 0) {
      try { room.router.close(); } catch (_) { /* already closed */ }
      rooms.delete(roomId);
      activeMeetingsGauge.set(rooms.size);
      console.log(`🗑️ [Room] Deleted empty room "${roomId}"`);
    }

    activeParticipantsGauge.set(this._countAllPeers());
  },

  getAllProducersInRoom(
    roomId: string,
    excludeUserId: string
  ): Array<{ userId: string; producerId: string; kind: string }> {
    const room = rooms.get(roomId);
    if (!room) return [];

    const result: Array<{ userId: string; producerId: string; kind: string }> = [];
    for (const [userId, peer] of room.peers) {
      if (userId === excludeUserId) continue;
      for (const [producerId, producer] of peer.producers) {
        if (!producer.closed) {
          result.push({ userId, producerId, kind: producer.kind });
        }
      }
    }
    return result;
  },

  getRoomCount(): number {
    return rooms.size;
  },

  _countAllPeers(): number {
    let count = 0;
    for (const room of rooms.values()) count += room.peers.size;
    return count;
  },
};
