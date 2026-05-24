import { describe, it, expect, vi, beforeEach } from 'vitest';
import { channelService } from '../../src/services/channel.service.js';
import { db } from '../../src/db/client.js';

// Mock DB
vi.mock('../../src/db/client.js', () => ({
  db: {
    transaction: vi.fn(async (cb) => {
        // Return a mock transaction object with a query property
        const tx = {
            query: {
                channelMembers: {
                    findMany: vi.fn(() => [])
                }
            },
            insert: vi.fn(() => ({
                values: vi.fn(() => ({
                    returning: vi.fn(() => [{ id: 'new-chan-id', name: 'New Channel' }])
                }))
            }))
        };
        return await cb(tx);
    }),
    insert: vi.fn(() => ({
        values: vi.fn(() => ({
            onConflictDoNothing: vi.fn(() => ({ success: true }))
        }))
    }))
  }
}));

describe('Channel Service (FR)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new channel via transaction', async () => {
    const result = await channelService.createChannel({
      name: 'Test Room',
      type: 'group',
      creatorId: 'user-1',
      memberIds: ['user-2']
    });

    expect(db.transaction).toHaveBeenCalled();
    expect(result.id).toBe('new-chan-id');
  });

  it('should correctly build member data for addMembers', async () => {
      const res = await channelService.addMembers('chan-1', ['user-3', 'user-4']);
      expect(res.success).toBe(true);
      expect(db.insert).toHaveBeenCalled();
  });
});
