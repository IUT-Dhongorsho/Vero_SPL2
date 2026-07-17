import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signalService } from '../../src/services/signal.service.js';
import { roomService } from '../../src/services/room.service.js';
import { db } from '../../src/db/client.js';

const mockSocket = () => {
  const socket = {
    id: 'mock-socket-id',
    user: { id: 'test-user-1', name: 'Test User' },
    data: {},
    join: vi.fn(),
    leave: vi.fn(),
    emit: vi.fn(),
    to: vi.fn().mockReturnThis(),
  };
  return socket as any;
};

// Mock DB interactions
vi.mock('../../src/db/client.js', () => ({
  db: {
    query: {
      meetings: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'mock-meeting-id', startedAt: new Date() }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock('../../src/services/publisher.service.js', () => ({
  publisherService: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
}));

// Instead of mocking the room service entirely (which breaks internal state),
// we use the REAL roomService but mock the mediasoup dependencies!
vi.mock('../../src/sfu/worker.js', () => ({
  getNextWorker: vi.fn().mockReturnValue({ pid: 1234 }),
}));
vi.mock('../../src/sfu/router.js', () => ({
  createRouter: vi.fn().mockResolvedValue({
    rtpCapabilities: {},
    close: vi.fn(),
  }),
}));
vi.mock('../../src/sfu/transport.js', () => ({
  createWebRtcTransport: vi.fn(),
}));
vi.mock('../../src/sfu/producer-consumer.js', () => ({
  createConsumer: vi.fn(),
}));
vi.mock('../../src/monitoring/metrics.js', () => ({
  activeMeetingsGauge: { set: vi.fn() },
  activeParticipantsGauge: { set: vi.fn() },
}));

describe('SignalService (Integration-ish)', () => {
  let socket: any;
  const io: any = { sockets: { sockets: new Map() } };
  let roomId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = mockSocket();
    roomId = `test-room-${Math.random()}`;
  });

  it('handleJoin should add peer to room, join socket room, and insert DB records', async () => {
    await signalService.handleJoin(io, socket, { roomId });

    // Verify socket joined the room
    expect(socket.join).toHaveBeenCalledWith(roomId);
    expect(socket.data.roomId).toBe(roomId);

    // Verify DB was updated
    expect(db.query.meetings.findFirst).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalledTimes(2); 

    // Verify real room service recorded the peer
    const peer = roomService.getPeer(roomId, 'test-user-1');
    expect(peer).toBeDefined();

    expect(socket.emit).toHaveBeenCalledWith('room-joined', expect.any(Object));
  });

  it('handleDisconnect should clean up peer and update DB leftAt', async () => {
    socket.data.roomId = roomId;
    
    // Connect them first so room service knows about them
    await roomService.getOrCreateRoom(roomId);
    roomService.addPeer(roomId, 'test-user-1', socket.id);

    await signalService.handleDisconnect(io, socket);

    expect(socket.to).toHaveBeenCalledWith(roomId);
    expect(db.update).toHaveBeenCalled();
    
    // Verify room service cleaned them up
    const peer = roomService.getPeer(roomId, 'test-user-1');
    expect(peer).toBeUndefined();
  });
});
