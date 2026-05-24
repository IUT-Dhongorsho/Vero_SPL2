import { db } from '../db/client.js';
import { sessions } from '../models/user.model.js';
import { eq, and, gt, or } from 'drizzle-orm';
export const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Token not provided' });
    }
    try {
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        const isJWT = token.startsWith('eyJ');
        console.log(`🔍 [AuthMiddleware] Verifying token (${isJWT ? 'JWT' : 'Opaque'}):`, token.substring(0, 20) + '...');
        // 1. Locally verify the session against our REPLICA table
        // We check BOTH the custom authToken (JWT) and the standard token for debugging
        const activeSession = await db.query.sessions.findFirst({
            where: and(or(eq(sessions.authToken, token), eq(sessions.token, token)), gt(sessions.expiresAt, new Date())),
            with: {
                user: true
            }
        });
        if (!activeSession) {
            console.warn('❌ [AuthMiddleware] No active session found for token.');
            // Detailed debug: Check if token exists in either column
            const byAuthToken = await db.query.sessions.findFirst({ where: eq(sessions.authToken, token) });
            const byToken = await db.query.sessions.findFirst({ where: eq(sessions.token, token) });
            console.log(`📊 [AuthMiddleware] Debug Lookup: Match in authToken col: ${!!byAuthToken}, Match in token col: ${!!byToken}`);
            if (byAuthToken || byToken) {
                const match = byAuthToken || byToken;
                console.warn(`⚠️ [AuthMiddleware] Session exists but is likely EXPIRED. ExpiresAt: ${match?.expiresAt}`);
            }
            return res.status(401).json({ error: 'Invalid or expired session' });
        }
        if (activeSession.authToken === token) {
            console.log('✅ [AuthMiddleware] Verified via Custom JWT (authToken)');
        }
        else {
            console.log('⚠️ [AuthMiddleware] Verified via standard BetterAuth token (NOT JWT)');
        }
        if (!activeSession.user) {
            console.warn('❌ [AuthMiddleware] Session found but associated user is missing in replica.');
            return res.status(401).json({ error: 'Invalid or expired session' });
        }
        console.log('✅ [AuthMiddleware] Authorized user:', activeSession.user.id);
        // Attach the local DB user record
        req.user = activeSession.user;
        req.session = activeSession;
        next();
    }
    catch (err) {
        console.error('Session Verification Error:', err.message);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};
