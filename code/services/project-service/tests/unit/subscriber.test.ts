import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subscriberService } from '../../src/services/subscriber.service.js';
import { db } from '../../src/db/client.js';

// Mock the DB
vi.mock('../../src/db/client.js', () => ({
  db: {
    transaction: vi.fn(),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => ({
          returning: vi.fn()
        })),
        onConflictDoNothing: vi.fn(() => ({
            returning: vi.fn(() => [])
        }))
      }))
    })),
    delete: vi.fn(() => ({
        where: vi.fn()
    }))
  }
}));

describe('Subscriber Service (FR: Auto-Workspace)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should attempt to create a workspace when USER_CREATED event is received', async () => {
    const mockUser = {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com'
    };

    // Trigger the private handler (using any to bypass private check for test)
    await (subscriberService as any).handleAuthEvent({
      type: 'USER_CREATED',
      data: mockUser
    });

    // Verify transaction was started
    expect(db.transaction).toHaveBeenCalled();
  });
});
