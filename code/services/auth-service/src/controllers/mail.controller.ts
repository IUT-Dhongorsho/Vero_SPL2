import { Response } from "express";
import type { AuthedRequest } from "../middleware/session.js";
import {
	GmailNotConnectedError,
	getConnectionStatus,
	getMessage,
	listRecentInbox,
	replyToMessage,
} from "../services/gmail.service.js";

function handleError(error: unknown, res: Response, fallback: string) {
	if (error instanceof GmailNotConnectedError) {
		return res.status(409).json({ error: "gmail-not-connected", reason: error.reason });
	}
	console.error(`[mail] ${fallback}`, error);
	res.status(500).json({ error: fallback });
}

export const mailStatusController = async (req: AuthedRequest, res: Response) => {
	try {
		res.json(await getConnectionStatus(req.userId!));
	} catch (error) {
		handleError(error, res, "Failed to check Gmail connection");
	}
};

/** GET /mail/inbox?limit=5 */
export const mailInboxController = async (req: AuthedRequest, res: Response) => {
	try {
		const status = await getConnectionStatus(req.userId!);
		if (!status.connected) {
			return res.json({ connected: false, ...status, messages: [] });
		}
		const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);
		const messages = await listRecentInbox(req.userId!, limit);
		res.json({ connected: true, messages });
	} catch (error) {
		handleError(error, res, "Failed to load inbox");
	}
};

export const mailMessageController = async (req: AuthedRequest, res: Response) => {
	try {
		res.json(await getMessage(req.userId!, req.params.id));
	} catch (error) {
		handleError(error, res, "Failed to load message");
	}
};

/** POST /mail/messages/:id/reply — sends on the user's behalf, on their explicit action. */
export const mailReplyController = async (req: AuthedRequest, res: Response) => {
	try {
		const body = String(req.body?.body ?? "").trim();
		if (!body) return res.status(400).json({ error: "Reply body is required" });

		const sent = await replyToMessage(req.userId!, { messageId: req.params.id, body });
		res.json({ success: true, id: sent.id, threadId: sent.threadId });
	} catch (error) {
		handleError(error, res, "Failed to send reply");
	}
};
