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

  addPeer(roomId: string, peerId: string, userId: string, socketId: string, userName?: string): Peer {
    const room = rooms.get(roomId)!;
    const peer: Peer = {
      id: peerId,
      userId,
      socketId,
      userName,
      rtpCapabilities: null,
      sendTransport: null,
      recvTransport: null,
      producers: new Map(),
      consumers: new Map(),
    };
    room.peers.set(peerId, peer);
    activeParticipantsGauge.set(this._countAllPeers());
    return peer;
  },

  getPeer(roomId: string, peerId: string): Peer | undefined {
    return rooms.get(roomId)?.peers.get(peerId);
  },

  getPeersByUserId(roomId: string, userId: string): Peer[] {
    const room = rooms.get(roomId);
    if (!room) return [];
    const list: Peer[] = [];
    for (const peer of room.peers.values()) {
      if (peer.userId === userId) {
        list.push(peer);
      }
    }
    return list;
  },

  removePeer(roomId: string, peerId: string, keepRoomIfEmpty = false): void {
    const room = rooms.get(roomId);
    if (!room) return;

    const peer = room.peers.get(peerId);
    if (peer) {
      try { peer.sendTransport?.close(); } catch (_) { /* already closed */ }
      try { peer.recvTransport?.close(); } catch (_) { /* already closed */ }
      for (const p of peer.producers.values()) {
        try { p.close(); } catch (_) {}
      }
      for (const c of peer.consumers.values()) {
        try { c.close(); } catch (_) {}
      }
      room.peers.delete(peerId);
    }

    if (room.peers.size === 0 && !keepRoomIfEmpty) {
      try { room.router.close(); } catch (_) { /* already closed */ }
      rooms.delete(roomId);
      activeMeetingsGauge.set(rooms.size);
      console.log(`🗑️ [Room] Deleted empty room "${roomId}"`);
    }

    activeParticipantsGauge.set(this._countAllPeers());
  },

  hasUserInRoom(roomId: string, userId: string): boolean {
    const room = rooms.get(roomId);
    if (!room) return false;
    for (const peer of room.peers.values()) {
      if (peer.userId === userId) return true;
    }
    return false;
  },

  getAllProducersInRoom(
    roomId: string,
    excludePeerId: string
  ): Array<{ peerId: string; userId: string; userName?: string; producerId: string; kind: string }> {
    const room = rooms.get(roomId);
    if (!room) return [];

    const result: Array<{ peerId: string; userId: string; userName?: string; producerId: string; kind: string }> = [];
    for (const [peerId, peer] of room.peers) {
      if (peerId === excludePeerId) continue;
      for (const [producerId, producer] of peer.producers) {
        if (!producer.closed) {
          result.push({
            peerId,
            userId: peer.userId,
            userName: peer.userName,
            producerId,
            kind: producer.kind,
          });
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
