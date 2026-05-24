import { Request, Response } from "express";
import { db } from "../db/client.js";
import { user } from "../models/user.model.js";
import { eq } from "drizzle-orm";
import { auth } from "../services/auth.service.js";
import { publisherService } from "../services/publisher.service.js";

export const updateProfileController = async (req: Request, res: Response) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers as any
        });

        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const userId = session.user.id;
        const updates = req.body;

        // Filter out fields that shouldn't be updated manually via this endpoint
        const { id, email, emailVerified, createdAt, updatedAt, ...allowedUpdates } = updates;

        const [updatedUser] = await db.update(user)
            .set({
                ...allowedUpdates,
                updatedAt: new Date(),
            })
            .where(eq(user.id, userId))
            .returning();

        if (updatedUser) {
            await publisherService.publishUserEvent('USER_UPDATED', updatedUser);
        }

        res.json({ success: true, message: "Profile updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update profile" });
    }
};

export const getProfileController = async (req: Request, res: Response) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers as any
        });

        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const userData = await db.query.user.findFirst({
            where: eq(user.id, session.user.id)
        });

        res.json(userData);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch profile" });
    }
};
