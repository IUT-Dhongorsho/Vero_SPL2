import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import crypto from 'crypto';

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  sessionId: string;
  [key: string]: any;
}

/**
 * Generates a symmetric HS256 JWT for microservice communication.
 * @param payload - User data to encode
 * @returns Signed JWT string
 */
export const generateJWT = (payload: JWTPayload): string => {
  return jwt.sign(payload, env.BETTER_AUTH_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
};

/**
 * Generates a high-entropy opaque refresh token.
 */
export const generateRefreshToken = (): string => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Decodes and verifies a JWT locally.
 * @param token - Bearer token from header
 * @returns Decoded payload or throws error
 */
export const decodeJWT = (token: string): JWTPayload => {
  const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
  return jwt.verify(cleanToken, env.BETTER_AUTH_SECRET, {
    algorithms: ['HS256'],
  }) as JWTPayload;
};
