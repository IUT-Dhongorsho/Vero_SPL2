import { Request, Response } from "express";
import { auth } from "../services/auth.service.js";
import { generateJWT } from "../utils/jwt.util.js";
import { db } from "../db/client.js";
import { eq } from "drizzle-orm";
import * as schema from "../models/user.model.js";

export class AuthController {
    /**
     * Retrieves the current session which now contains our stateless JWT for microservices.
     */
    async getSession(req: Request, res: Response) {
        try {
            const session = await auth.api.getSession({
                headers: req.headers as any
            });

            if (!session) {
                console.warn('🔍 [AuthController:getSession] No session found');
                return res.status(401).json({ error: "Unauthorized" });
            }

            console.log(`🔍 [AuthController:getSession] Returning session for user: ${session.user.id}`);
            console.log(`🔑 [AuthController:getSession] Custom AuthToken Present: ${!!(session.session as any).authToken}`);

            res.json(session);
        } catch (error) {
            console.error("Auth Exception:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
}

export const authController = new AuthController();
