import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { userActivityDays, userActivityRoutes } from "../models/activity.model.js";

/**
 * Clients beat every HEARTBEAT_INTERVAL_SECONDS while the tab is visible.
 * A gap larger than the grace window means the user went away, so that gap is
 * *not* counted as active time — it opens a new visit instead.
 */
export const HEARTBEAT_INTERVAL_SECONDS = 30;
const MAX_CREDITED_GAP_SECONDS = HEARTBEAT_INTERVAL_SECONDS * 3; // 90s

function dayKey(date: Date, timezone?: string): string {
	try {
		if (timezone) {
			// en-CA gives YYYY-MM-DD
			return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
		}
	} catch {
		/* invalid timezone — fall through to server-local */
	}
	return new Intl.DateTimeFormat("en-CA").format(date);
}

export interface HeartbeatInput {
	userId: string;
	route?: string;
	timezone?: string;
}

export interface HeartbeatResult {
	creditedSeconds: number;
	activeSecondsToday: number;
	day: string;
}

/**
 * Records a heartbeat and returns how much time was credited.
 */
export async function recordHeartbeat({ userId, route, timezone }: HeartbeatInput): Promise<HeartbeatResult> {
	const now = new Date();
	const day = dayKey(now, timezone);

	const [existing] = await db
		.select()
		.from(userActivityDays)
		.where(and(eq(userActivityDays.userId, userId), eq(userActivityDays.day, day)))
		.limit(1);

	if (!existing) {
		const [created] = await db
			.insert(userActivityDays)
			.values({
				userId,
				day,
				activeSeconds: 0,
				sessionCount: 1,
				firstSeenAt: now,
				lastSeenAt: now,
			})
			.onConflictDoNothing()
			.returning();

		if (created) {
			await bumpRoute(userId, route, 0, now);
			return { creditedSeconds: 0, activeSecondsToday: 0, day };
		}
		// Lost a race with a concurrent heartbeat — fall through and re-read.
		return recordHeartbeat({ userId, route, timezone });
	}

	const gapSeconds = Math.max(0, Math.round((now.getTime() - existing.lastSeenAt.getTime()) / 1000));
	const isContiguous = gapSeconds > 0 && gapSeconds <= MAX_CREDITED_GAP_SECONDS;
	const creditedSeconds = isContiguous ? gapSeconds : 0;

	const [updated] = await db
		.update(userActivityDays)
		.set({
			activeSeconds: existing.activeSeconds + creditedSeconds,
			sessionCount: isContiguous ? existing.sessionCount : existing.sessionCount + 1,
			lastSeenAt: now,
		})
		.where(eq(userActivityDays.id, existing.id))
		.returning();

	await bumpRoute(userId, route, creditedSeconds, now);

	return {
		creditedSeconds,
		activeSecondsToday: updated?.activeSeconds ?? existing.activeSeconds,
		day,
	};
}

async function bumpRoute(userId: string, route: string | undefined, seconds: number, now: Date) {
	if (!route) return;
	const normalised = normaliseRoute(route);
	await db
		.insert(userActivityRoutes)
		.values({ userId, route: normalised, activeSeconds: seconds, lastSeenAt: now })
		.onConflictDoUpdate({
			target: [userActivityRoutes.userId, userActivityRoutes.route],
			set: {
				activeSeconds: sql`${userActivityRoutes.activeSeconds} + ${seconds}`,
				lastSeenAt: now,
			},
		});
}

/** Collapses ids out of paths so `/project/abc-123` buckets as `/project/:id`. */
export function normaliseRoute(route: string): string {
	const path = route.split("?")[0].replace(/\/+$/, "") || "/";
	return path
		.split("/")
		.map((segment) =>
			/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment) || /^\d+$/.test(segment) || segment.length > 20
				? ":id"
				: segment
		)
		.join("/");
}

export interface ActivitySummary {
	totalActiveSeconds: number;
	todayActiveSeconds: number;
	last7DaysSeconds: number;
	averageSecondsPerActiveDay: number;
	activeDays: number;
	currentStreak: number;
	longestStreak: number;
	firstSeenAt: string | null;
	daily: { day: string; activeSeconds: number; sessionCount: number }[];
	topRoutes: { route: string; activeSeconds: number }[];
}

export async function getActivitySummary(userId: string, days = 30, timezone?: string): Promise<ActivitySummary> {
	const since = new Date();
	since.setDate(since.getDate() - (days - 1));
	const sinceKey = dayKey(since, timezone);

	const rows = await db
		.select()
		.from(userActivityDays)
		.where(and(eq(userActivityDays.userId, userId), gte(userActivityDays.day, sinceKey)))
		.orderBy(userActivityDays.day);

	const [totals] = await db
		.select({
			total: sql<number>`coalesce(sum(${userActivityDays.activeSeconds}), 0)::int`,
			activeDays: sql<number>`count(*)::int`,
			firstSeen: sql<string | null>`min(${userActivityDays.firstSeenAt})`,
		})
		.from(userActivityDays)
		.where(eq(userActivityDays.userId, userId));

	const allDays = await db
		.select({ day: userActivityDays.day, activeSeconds: userActivityDays.activeSeconds })
		.from(userActivityDays)
		.where(eq(userActivityDays.userId, userId))
		.orderBy(desc(userActivityDays.day));

	const topRoutes = await db
		.select({ route: userActivityRoutes.route, activeSeconds: userActivityRoutes.activeSeconds })
		.from(userActivityRoutes)
		.where(eq(userActivityRoutes.userId, userId))
		.orderBy(desc(userActivityRoutes.activeSeconds))
		.limit(8);

	// Fill gaps so the chart has a continuous axis.
	const byDay = new Map(rows.map((r) => [r.day, r]));
	const daily: ActivitySummary["daily"] = [];
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date();
		d.setDate(d.getDate() - i);
		const key = dayKey(d, timezone);
		const row = byDay.get(key);
		daily.push({ day: key, activeSeconds: row?.activeSeconds ?? 0, sessionCount: row?.sessionCount ?? 0 });
	}

	const todayKey = dayKey(new Date(), timezone);
	const todayActiveSeconds = byDay.get(todayKey)?.activeSeconds ?? 0;
	const last7DaysSeconds = daily.slice(-7).reduce((sum, d) => sum + d.activeSeconds, 0);

	const activeDays = totals?.activeDays ?? 0;
	const totalActiveSeconds = totals?.total ?? 0;

	return {
		totalActiveSeconds,
		todayActiveSeconds,
		last7DaysSeconds,
		averageSecondsPerActiveDay: activeDays > 0 ? Math.round(totalActiveSeconds / activeDays) : 0,
		activeDays,
		currentStreak: computeCurrentStreak(allDays.map((d) => d.day), todayKey),
		longestStreak: computeLongestStreak(allDays.map((d) => d.day)),
		firstSeenAt: totals?.firstSeen ? new Date(totals.firstSeen).toISOString() : null,
		daily,
		topRoutes: topRoutes.filter((r) => r.activeSeconds > 0),
	};
}

function toUtcDate(key: string): number {
	const [y, m, d] = key.split("-").map(Number);
	return Date.UTC(y, m - 1, d);
}

const DAY_MS = 86_400_000;

/** Streak counts back from today; a day missed yesterday still counts if today is active. */
export function computeCurrentStreak(dayKeysDesc: string[], todayKey: string): number {
	const set = new Set(dayKeysDesc);
	let cursor = toUtcDate(todayKey);
	// If today has no activity yet, start the count from yesterday.
	if (!set.has(todayKey)) cursor -= DAY_MS;

	let streak = 0;
	while (set.has(new Date(cursor).toISOString().slice(0, 10))) {
		streak++;
		cursor -= DAY_MS;
	}
	return streak;
}

export function computeLongestStreak(dayKeys: string[]): number {
	const sorted = [...new Set(dayKeys)].sort();
	let longest = 0;
	let run = 0;
	let previous: number | null = null;

	for (const key of sorted) {
		const ts = toUtcDate(key);
		run = previous !== null && ts - previous === DAY_MS ? run + 1 : 1;
		previous = ts;
		if (run > longest) longest = run;
	}
	return longest;
}
