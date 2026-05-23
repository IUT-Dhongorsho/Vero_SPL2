import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
export const authMiddleware = (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
    if (!token) {
        return next(new Error('Authentication error: Token not provided'));
    }
    try {
        const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
        const decoded = jwt.verify(cleanToken, env.JWT_SECRET);
        socket.user = decoded;
        next();
    }
    catch (err) {
        next(new Error('Authentication error: Invalid token'));
    }
};
