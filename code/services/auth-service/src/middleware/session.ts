import { NextFunction, Request, Response } from "express";
import { auth } from "../services/auth.service.js";

export interface AuthedRequest extends Request {
	userId?: string;
	userEmail?: string;
}

/**
 * Resolves the Better Auth session (cookie or bearer) and pins the user id on
 * the request. Responds 401 when there is no valid session.
 */
export async function requireSession(req: AuthedRequest, res: Response, next: NextFunction) {
	try {
		const session = await auth.api.getSession({ headers: req.headers as any });
		if (!session?.user?.id) {
			return res.status(401).json({ error: "Unauthorized" });
		}
		req.userId = session.user.id;
		req.userEmail = session.user.email;
		next();
	} catch (error) {
		console.error("[requireSession] failed to resolve session", error);
		res.status(401).json({ error: "Unauthorized" });
	}
}
