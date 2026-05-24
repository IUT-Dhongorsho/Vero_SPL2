import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publisherService, redisClient } from '../../src/services/publisher.service.js';

// Mock Redis
vi.mock('ioredis', () => {
    return {
        Redis: vi.fn().mockImplementation(() => ({
            publish: vi.fn().mockResolvedValue(1)
        }))
    };
});

describe('Publisher Service (FR)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should publish a user event to Redis', async () => {
    const mockUser = { id: 'u-1', name: 'Nafis' };
    await publisherService.publishUserEvent('USER_CREATED', mockUser);
    
    expect(redisClient.publish).toHaveBeenCalledWith(
        'user_events',
        expect.stringContaining('USER_CREATED')
    );
  });

  it('should include session specific logs for SESSION_CREATED', async () => {
      const mockSession = { id: 's-1', userId: 'u-1', authToken: 'jwt-1' };
      await publisherService.publishUserEvent('SESSION_CREATED', mockSession);
      
      expect(redisClient.publish).toHaveBeenCalledWith(
          'user_events',
          expect.stringContaining('jwt-1')
      );
  });
});
