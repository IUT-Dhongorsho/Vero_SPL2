import { describe, it, expect, vi } from 'vitest';
import { authMiddleware } from '../../src/ws/middlewares/auth.middleware.js';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

describe('Auth Middleware', () => {
  it('should call next() if a valid token is provided', () => {
    const mockSocket = {
      handshake: {
        auth: { token: 'Bearer valid-token' },
        headers: {},
      },
      user: undefined,
    } as any;
    const next = vi.fn();

    vi.spyOn(jwt, 'verify').mockReturnValue({ id: 'user-123' } as any);

    authMiddleware(mockSocket, next);

    expect(next).toHaveBeenCalledWith();
    expect(mockSocket.user).toEqual({ id: 'user-123' });
  });

  it('should call next with error if no token is provided', () => {
    const mockSocket = {
      handshake: { auth: {}, headers: {} },
    } as any;
    const next = vi.fn();

    authMiddleware(mockSocket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toContain('Token not provided');
  });

  it('should call next with error if token is invalid', () => {
    const mockSocket = {
      handshake: { auth: { token: 'invalid-token' }, headers: {} },
    } as any;
    const next = vi.fn();

    vi.spyOn(jwt, 'verify').mockImplementation(() => {
      throw new Error('invalid');
    });

    authMiddleware(mockSocket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toContain('Invalid token');
  });
});
