import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authMiddleware } from '../../src/ws/middlewares/auth.middleware.js';
import { db } from '../../src/db/client.js';

// Mock DB
vi.mock('../../src/db/client.js', () => ({
  db: {
    query: {
      sessions: {
        findFirst: vi.fn()
      }
    }
  }
}));

describe('WS Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call next() if a valid session is found in DB', async () => {
    const mockSocket = {
      handshake: {
        auth: { token: 'Bearer valid-jwt' },
        headers: {},
      },
      user: undefined,
    } as any;
    const next = vi.fn();

    const mockSession = {
        authToken: 'valid-jwt',
        expiresAt: new Date(Date.now() + 10000),
        user: { id: 'user-123', name: 'Nafis' }
    };

    (db.query.sessions.findFirst as any).mockResolvedValue(mockSession);

    await authMiddleware(mockSocket, next);

    expect(next).toHaveBeenCalledWith();
    expect(mockSocket.user).toEqual(mockSession.user);
  });

  it('should call next with error if no token is provided', async () => {
    const mockSocket = {
      handshake: { auth: {}, headers: {} },
    } as any;
    const next = vi.fn();

    await authMiddleware(mockSocket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toContain('Token not provided');
  });

  it('should call next with error if session is not found or expired', async () => {
    const mockSocket = {
      handshake: { auth: { token: 'invalid-token' }, headers: {} },
    } as any;
    const next = vi.fn();

    // Mock finding nothing in DB
    (db.query.sessions.findFirst as any).mockResolvedValue(null);

    await authMiddleware(mockSocket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toContain('Invalid or expired session');
  });
});
