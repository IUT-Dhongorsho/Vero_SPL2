import { describe, it, expect, vi, beforeEach } from 'vitest';
import { roomService } from '../../src/services/room.service.js';
import * as workerModule from '../../src/sfu/worker.js';
import * as routerModule from '../../src/sfu/router.js';

vi.mock('../../src/sfu/worker.js', () => ({
  getNextWorker: vi.fn().mockReturnValue({ pid: 1234 }),
}));

vi.mock('../../src/sfu/router.js', () => ({
  createRouter: vi.fn().mockResolvedValue({
    id: 'mock-router',
    rtpCapabilities: {},
    close: vi.fn(),
  }),
}));

vi.mock('../../src/monitoring/metrics.js', () => ({
  activeMeetingsGauge: { set: vi.fn() },
  activeParticipantsGauge: { set: vi.fn() },
}));

describe('RoomService (Unit)', () => {
  let roomId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    roomId = `test-room-${Math.random()}`; // Unique room per test to avoid state collision
  });

  it('should create a room lazily when the first peer joins', async () => {
    const initialCount = roomService.getRoomCount();
    const room = await roomService.getOrCreateRoom(roomId);

    expect(room).toBeDefined();
    expect(room.id).toBe(roomId);
    expect(workerModule.getNextWorker).toHaveBeenCalledTimes(1);
    expect(routerModule.createRouter).toHaveBeenCalledTimes(1);
    expect(roomService.getRoomCount()).toBe(initialCount + 1);
  });

  it('should not create a new room if one already exists', async () => {
    const initialCount = roomService.getRoomCount();
    await roomService.getOrCreateRoom(roomId);
    await roomService.getOrCreateRoom(roomId);

    expect(roomService.getRoomCount()).toBe(initialCount + 1);
  });

  it('should add and retrieve peers correctly', async () => {
    await roomService.getOrCreateRoom(roomId);
    const peer = roomService.addPeer(roomId, 'user1', 'socket1');

    expect(peer.userId).toBe('user1');
    expect(peer.socketId).toBe('socket1');
    
    const retrieved = roomService.getPeer(roomId, 'user1');
    expect(retrieved).toBe(peer);
  });

  it('should delete the room when the last peer leaves', async () => {
    const initialCount = roomService.getRoomCount();
    await roomService.getOrCreateRoom(roomId);
    roomService.addPeer(roomId, 'user1', 'socket1');
    roomService.addPeer(roomId, 'user2', 'socket2');

    expect(roomService.getRoomCount()).toBe(initialCount + 1);

    roomService.removePeer(roomId, 'user1');
    expect(roomService.getRoomCount()).toBe(initialCount + 1); // Room still active

    roomService.removePeer(roomId, 'user2');
    expect(roomService.getRoomCount()).toBe(initialCount); // Room deleted
  });
});
