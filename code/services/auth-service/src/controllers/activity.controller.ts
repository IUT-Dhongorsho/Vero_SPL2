import { Response } from "express";
import type { AuthedRequest } from "../middleware/session.js";
import {
	HEARTBEAT_INTERVAL_SECONDS,
	getActivitySummary,
	recordHeartbeat,
} from "../services/activity.service.js";

/**
 * POST /user/activity/heartbeat
 * The client calls this on an interval while the tab is visible. Time is only
 * credited for the gap between consecutive beats, so closing the laptop or
 * switching tabs stops the clock.
 */
export const heartbeatController = async (req: AuthedRequest, res: Response) => {
	try {
		const { route, timezone } = req.body ?? {};
		const result = await recordHeartbeat({
			userId: req.userId!,
			route: typeof route === "string" ? route : undefined,
			timezone: typeof timezone === "string" ? timezone : undefined,
		});
		res.json({ ...result, intervalSeconds: HEARTBEAT_INTERVAL_SECONDS });
	} catch (error) {
		console.error("[heartbeat]", error);
		res.status(500).json({ error: "Failed to record activity" });
	}
};

/** GET /user/activity/summary?days=30 */
export const activitySummaryController = async (req: AuthedRequest, res: Response) => {
	try {
		const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 365);
		const timezone = typeof req.query.tz === "string" ? req.query.tz : undefined;
		const summary = await getActivitySummary(req.userId!, days, timezone);
		res.json(summary);
	} catch (error) {
		console.error("[activitySummary]", error);
		res.status(500).json({ error: "Failed to load activity summary" });
	}
};
