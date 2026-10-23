import { Response } from "express";
import { db } from "../db/client.js";
import { user } from "../models/user.model.js";
import { and, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { publisherService } from "../services/publisher.service.js";
import type { AuthedRequest } from "../middleware/session.js";

/** Fields a user is allowed to change about themselves. */
const EDITABLE_FIELDS = [
    "name",
    "username",
    "firstName",
    "lastName",
    "bio",
    "jobTitle",
    "department",
    "phoneNumber",
    "location",
    "image",
    "linkedinUrl",
    "githubUsername",
    "websiteUrl",
    "skills",
    "theme",
    "language",
    "timezone",
    "onboardingCompleted",
] as const;

/** Never leak credentials or moderation state to the client. */
const PUBLIC_USER_COLUMNS = {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    bio: user.bio,
    jobTitle: user.jobTitle,
    department: user.department,
    phoneNumber: user.phoneNumber,
    location: user.location,
    linkedinUrl: user.linkedinUrl,
    githubUsername: user.githubUsername,
    websiteUrl: user.websiteUrl,
    skills: user.skills,
    theme: user.theme,
    language: user.language,
    timezone: user.timezone,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    role: user.role,
};

/** Minimal shape used by search results and member chips. */
const DIRECTORY_COLUMNS = {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    image: user.image,
    jobTitle: user.jobTitle,
};

export const updateProfileController = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const updates: Record<string, unknown> = {};

        for (const field of EDITABLE_FIELDS) {
            if (field in req.body) {
                const value = req.body[field];
                updates[field] = value === "" ? null : value;
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No editable fields supplied" });
        }

        if (typeof updates.username === "string") {
            const handle = (updates.username as string).trim().toLowerCase();
            if (!/^[a-z0-9_.-]{3,32}$/.test(handle)) {
                return res.status(400).json({
                    error: "Username must be 3-32 characters using letters, numbers, dot, dash or underscore",
                });
            }
            const [taken] = await db
                .select({ id: user.id })
                .from(user)
                .where(and(eq(user.username, handle), ne(user.id, userId)))
                .limit(1);
            if (taken) {
                return res.status(409).json({ error: "That username is already taken" });
            }
            updates.username = handle;
        }

        for (const urlField of ["linkedinUrl", "websiteUrl", "image"] as const) {
            const value = updates[urlField];
            if (typeof value === "string" && value.length > 0 && !/^(https?:\/\/|data:)/i.test(value)) {
                updates[urlField] = `https://${value}`;
            }
        }

        const [updatedUser] = await db
            .update(user)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(user.id, userId))
            .returning(PUBLIC_USER_COLUMNS);

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        await publisherService.publishUserEvent("USER_UPDATED", updatedUser as any);

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error("[updateProfile]", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
};

export const getProfileController = async (req: AuthedRequest, res: Response) => {
    try {
        const [userData] = await db
            .select(PUBLIC_USER_COLUMNS)
            .from(user)
            .where(eq(user.id, req.userId!))
            .limit(1);

        if (!userData) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(userData);
    } catch (error) {
        console.error("[getProfile]", error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
};

/**
 * Directory search used by the Inbox "add someone" flow.
 * Matches on username, email or display name. Excludes the caller.
 */
export const searchUsersController = async (req: AuthedRequest, res: Response) => {
    try {
        const query = String(req.query.q ?? "").trim();
        if (query.length < 2) {
            return res.json([]);
        }

        const pattern = `%${query.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
        const results = await db
            .select(DIRECTORY_COLUMNS)
            .from(user)
            .where(
                and(
                    ne(user.id, req.userId!),
                    or(ilike(user.username, pattern), ilike(user.email, pattern), ilike(user.name, pattern))
                )
            )
            // Exact handle/email matches first, then everything else alphabetically.
            .orderBy(
                sql`case when lower(${user.username}) = lower(${query}) or lower(${user.email}) = lower(${query}) then 0 else 1 end`,
                user.name
            )
            .limit(20);

        res.json(results);
    } catch (error) {
        console.error("[searchUsers]", error);
        res.status(500).json({ error: "Failed to search users" });
    }
};

/**
 * Bulk resolve users by id — other services store only ids, the UI needs names
 * and avatars.
 */
export const getUsersByIdsController = async (req: AuthedRequest, res: Response) => {
    try {
        const raw = String(req.query.ids ?? "");
        const ids: string[] = raw
            ? raw.split(",").map((id) => id.trim()).filter(Boolean)
            : Array.isArray(req.body?.ids)
              ? req.body.ids
              : [];

        if (ids.length === 0) return res.json([]);

        const results = await db
            .select(DIRECTORY_COLUMNS)
            .from(user)
            .where(inArray(user.id, ids.slice(0, 200)));

        res.json(results);
    } catch (error) {
        console.error("[getUsersByIds]", error);
        res.status(500).json({ error: "Failed to resolve users" });
    }
};

/** Public-facing profile of another user (used when opening someone's card). */
export const getPublicProfileController = async (req: AuthedRequest, res: Response) => {
    try {
        const identifier = String(req.params.identifier);
        const [found] = await db
            .select({
                ...DIRECTORY_COLUMNS,
                bio: user.bio,
                location: user.location,
                linkedinUrl: user.linkedinUrl,
                githubUsername: user.githubUsername,
                websiteUrl: user.websiteUrl,
                skills: user.skills,
                createdAt: user.createdAt,
            })
            .from(user)
            .where(or(eq(user.id, identifier), eq(user.username, identifier.toLowerCase())))
            .limit(1);

        if (!found) return res.status(404).json({ error: "User not found" });
        res.json(found);
    } catch (error) {
        console.error("[getPublicProfile]", error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
};
