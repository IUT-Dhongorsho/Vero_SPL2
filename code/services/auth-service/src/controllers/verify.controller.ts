import { Request, Response } from "express";
import { auth } from "../services/auth.service.js";
import { decodeJWT } from "../utils/jwt.util.js";
import { db } from "../db/client.js";
import * as schema from "../models/user.model.js";
import { eq, or, gt, and } from "drizzle-orm";

export const verifyController = async (req: Request, res: Response) => {
    try {
        // 1. Try resolving session via Better-Auth (cookie or standard bearer session token)
        const session = await auth.api.getSession({
            headers: req.headers as any
        });

        if (session) {
            return res.json(session);
        }

        // 2. If Better-Auth couldn't resolve, check for custom Bearer authToken (JWT or session token)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.slice(7).trim();

            // 2a. Check if it is a signed JWT authToken
            try {
                const payload = decodeJWT(token);
                if (payload && payload.id) {
                    const user = await db.query.user.findFirst({
                        where: eq(schema.user.id, payload.id)
                    });

                    if (user) {
                        let activeSession: any = null;
                        if (payload.sessionId) {
                            activeSession = await db.query.session.findFirst({
                                where: and(
                                    eq(schema.session.id, payload.sessionId),
                                    gt(schema.session.expiresAt, new Date())
                                )
                            });
                        }

                        if (!activeSession) {
                            activeSession = {
                                id: payload.sessionId || `jwt-${payload.id}`,
                                userId: user.id,
                                authToken: token,
                                expiresAt: payload.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                            };
                        }

                        return res.json({
                            user,
                            session: activeSession
                        });
                    }
                }
            } catch {
                // Not a valid JWT or signature mismatch, fallback to direct DB lookup
            }

            // 2b. Direct lookup by authToken or token in session table
            const dbSession = await db.query.session.findFirst({
                where: and(
                    or(
                        eq(schema.session.authToken, token),
                        eq(schema.session.token, token)
                    ),
                    gt(schema.session.expiresAt, new Date())
                )
            });

            if (dbSession) {
                const user = await db.query.user.findFirst({
                    where: eq(schema.user.id, dbSession.userId)
                });

                if (user) {
                    return res.json({
                        user,
                        session: dbSession
                    });
                }
            }
        }

        return res.status(401).json({ error: "Unauthorized" });
    } catch (error) {
        console.error("Internal verify error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
