import { pgTable, text, timestamp, boolean, varchar, uuid } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("emailVerified").notNull(),
	image: text("image"),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull(),
	
	// Elaborate fields for productivity app
	username: varchar("username", { length: 255 }).unique(),
	firstName: varchar("firstName", { length: 255 }),
	lastName: varchar("lastName", { length: 255 }),
	bio: text("bio"),
	jobTitle: varchar("jobTitle", { length: 255 }),
	department: varchar("department", { length: 255 }),
	phoneNumber: varchar("phoneNumber", { length: 50 }),
	location: varchar("location", { length: 255 }),
	
	// Preferences
	onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
	theme: varchar("theme", { length: 20 }).default("system").notNull(), // light, dark, system
	language: varchar("language", { length: 10 }).default("en").notNull(),
	timezone: varchar("timezone", { length: 255 }),
	
	// Status
	lastLoginAt: timestamp("lastLoginAt"),
	role: text("role").default("user").notNull(),
	banned: boolean("banned"),
	banReason: text("banReason"),
	banExpires: timestamp("banExpires"),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expiresAt").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull(),
	ipAddress: text("ipAddress"),
	userAgent: text("userAgent"),
	userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
	authToken: text("authToken"),
	refreshToken: text("refreshToken"),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("accountId").notNull(),
	providerId: text("providerId").notNull(),
	userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("accessToken"),
	refreshToken: text("refreshToken"),
	idToken: text("idToken"),
	accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
	refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expiresAt").notNull(),
	createdAt: timestamp("createdAt"),
	updatedAt: timestamp("updatedAt"),
});

export const jwks = pgTable("jwks", {
    id: text("id").primaryKey(),
    publicKey: text("publicKey").notNull(),
    privateKey: text("privateKey").notNull(),
    createdAt: timestamp("createdAt").notNull(),
});
