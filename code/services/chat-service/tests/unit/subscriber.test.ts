import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriberService } from '../../src/services/subscriber.service.js';
import { db } from '../../src/db/client.js';
import { users } from '../../src/models/user.model.js';

vi.mock('../../src/db/client.js', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue({}),
  },
}));

describe('User Event Propagation NFR', () => {
  let subscriberService: SubscriberService;

  beforeEach(() => {
    subscriberService = new SubscriberService();
    vi.clearAllMocks();
  });

  it('should sync local user table on USER_CREATED event', async () => {
    const event = {
      type: 'USER_CREATED',
      data: { id: 'u-123', name: 'John Doe', avatarUrl: 'http://avatar.com' },
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
});
