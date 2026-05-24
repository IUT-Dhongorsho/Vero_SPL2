import { Request, Response } from "express";
import { auth } from "../services/auth.service.js";

export const verifyController = async (req: Request, res: Response) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers as any
        });

        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        res.json(session);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};
