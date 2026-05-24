import { describe, it, expect, vi } from 'vitest';
import { generateJWT, decodeJWT } from '../../src/utils/jwt.util.js';

describe('JWT Utilities (NFR: Security)', () => {
  const mockPayload = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    sessionId: 'sess-1'
  };

  it('should generate a valid HS256 JWT', () => {
    const token = generateJWT(mockPayload);
    expect(token).toBeDefined();
    expect(token.split('.').length).toBe(3); // Header.Payload.Signature
  });

  it('should correctly decode a generated token', () => {
    const token = generateJWT(mockPayload);
    const decoded = decodeJWT(token);
    
    expect(decoded.id).toBe(mockPayload.id);
    expect(decoded.email).toBe(mockPayload.email);
    expect(decoded.sessionId).toBe(mockPayload.sessionId);
  });

  it('should throw error for invalid token', () => {
    expect(() => decodeJWT('invalid-token')).toThrow();
  });
});
