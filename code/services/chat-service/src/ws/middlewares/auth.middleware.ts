import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export interface AuthSocket extends Socket {
  user?: {
    id: string;
    [key: string]: any;
  };
}

export const authMiddleware = (socket: AuthSocket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];

  if (!token) {
    return next(new Error('Authentication error: Token not provided'));
  }

  try {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.verify(cleanToken, env.JWT_SECRET) as any;
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
};
