import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subscriberService } from '../../src/services/subscriber.service.js';
import { db } from '../../src/db/client.js';
import { users, sessions } from '../../src/models/user.model.js';

// Mock DB
vi.mock('../../src/db/client.js', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue({}),
  },
}));

describe('Subscriber Service (FR: Identity Sync)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sync local user table on USER_CREATED event', async () => {
    const event = {
      type: 'USER_CREATED',
      data: { id: 'u-123', name: 'John Doe', image: 'http://avatar.com' },
    };

    // Access private handleAuthEvent via type casting
    await (subscriberService as any).handleAuthEvent(event);

    expect(db.insert).toHaveBeenCalledWith(users);
    expect(db.values).toHaveBeenCalledWith({
      id: 'u-123',
      name: 'John Doe',
      avatarUrl: 'http://avatar.com',
    });
  });

  it('should replicate session on SESSION_CREATED event', async () => {
    const event = {
      type: 'SESSION_CREATED',
      data: {
        id: 's-123',
        token: 'token-123',
        userId: 'u-123',
        expiresAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        authToken: 'jwt-123',
        refreshToken: 'ref-123'
      },
    };

    await (subscriberService as any).handleAuthEvent(event);

    expect(db.insert).toHaveBeenCalledWith(sessions);
  });
});
