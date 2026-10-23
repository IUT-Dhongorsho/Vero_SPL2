import { pgTable, text, timestamp, integer, date, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./user.model.js";

/**
 * One row per (user, calendar day). `activeSeconds` is accumulated from client
 * heartbeats, so it reflects time the tab was actually open and focused rather
 * than wall-clock time since login.
 */
export const userActivityDays = pgTable(
	"user_activity_days",
	{
		id: text("id").primaryKey().default(sql`gen_random_uuid()`),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		day: date("day").notNull(), // YYYY-MM-DD in the user's reported timezone
		activeSeconds: integer("active_seconds").default(0).notNull(),
		// Number of distinct visits (a gap larger than the heartbeat window starts a new one)
		sessionCount: integer("session_count").default(1).notNull(),
		firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
		lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
	},
	(t) => ({
		userDayUnique: uniqueIndex("user_activity_days_user_day_idx").on(t.userId, t.day),
		userIdx: index("user_activity_days_user_idx").on(t.userId),
	})
);

/**
 * Lightweight page-level breakdown so the profile can show *where* the time went.
 */
export const userActivityRoutes = pgTable(
	"user_activity_routes",
	{
		id: text("id").primaryKey().default(sql`gen_random_uuid()`),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		route: text("route").notNull(), // normalised, e.g. "/inbox"
		activeSeconds: integer("active_seconds").default(0).notNull(),
		lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
	},
	(t) => ({
		userRouteUnique: uniqueIndex("user_activity_routes_user_route_idx").on(t.userId, t.route),
	})
);
