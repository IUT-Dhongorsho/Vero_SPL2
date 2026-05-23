import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PresenceStore } from '../../src/ws/store/presence.store.js';
import { redisClient } from '../../src/services/publisher.service.js';

vi.mock('../../src/services/publisher.service.js', () => ({
  redisClient: {
    hset: vi.fn(),
    hgetall: vi.fn(),
  },
}));

describe('PresenceStore', () => {
  let presenceStore: PresenceStore;

  beforeEach(() => {
    presenceStore = new PresenceStore();
    vi.clearAllMocks();
  });

  it('should set user online in Redis', async () => {
    await presenceStore.setUserOnline('user-1', 'socket-1');
    expect(redisClient.hset).toHaveBeenCalledWith(
      'presence:user-1',
      'status',
      'online',
      'lastSeen',
      expect.any(String)
    );
  });

  it('should set user offline in Redis', async () => {
    await presenceStore.setUserOffline('user-1');
    expect(redisClient.hset).toHaveBeenCalledWith(
      'presence:user-1',
      'status',
      'offline',
      'lastSeen',
      expect.any(String)
    );
  });
});
