import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, username, admin } from "better-auth/plugins";
import { dash } from "@better-auth/infra";
import { db } from "../db/client.js";
import { env } from "../config/env.js";
import * as schema from "../models/user.model.js";
import crypto from "crypto";
import { generateJWT, generateRefreshToken } from "../utils/jwt.util.js";
import { eq } from "drizzle-orm";

import { publisherService, publishMail } from "./publisher.service.js";

/**
 * Better Auth's reset link points at BETTER_AUTH_URL, which only bounces the
 * browser on to the app's own reset page (the origin-checked `redirectTo`).
 * Linking to that page directly keeps the email working when the auth URL is
 * not publicly reachable — an ngrok tunnel that is down, say.
 */
export function resetLinkFor(url: string, token: string): string {
    try {
        const callback = new URL(url).searchParams.get("callbackURL");
        if (callback) {
            const target = new URL(callback);
            target.searchParams.set("token", token);
            return target.toString();
        }
    } catch {
        /* fall through to Better Auth's own link */
    }
    return url;
}

export const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    // Better Auth defaults this to `/api/auth`, but every caller — the Express
    // route below, the nginx rule and the browser client — uses
    // `/api/better-auth`, so without this every auth request 404s.
    basePath: "/api/better-auth",
    secret: env.BETTER_AUTH_SECRET,
    // Better Auth marks cookies `Secure` whenever BETTER_AUTH_URL is https —
    // which it is behind ngrok — and browsers then drop the session on plain
    // http origins (localhost:3000, a LAN IP). Only a production deployment
    // that is actually served over https needs them.
    advanced: {
        useSecureCookies: env.NODE_ENV === "production" && env.BETTER_AUTH_URL.startsWith("https:"),
        // Better Auth silently skips origin checks under NODE_ENV=test; keep
        // them on everywhere so tests exercise the same rules as production.
        disableOriginCheck: false,
    },
    // The Vite dev server runs on :3000; :5173 stays for anyone on the Vite
    // default. Extra origins can be added with a comma-separated CLIENT_URL.
    trustedOrigins: [
        ...(process.env.CLIENT_URL?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? []),
        env.CLIENT_URL || "http://localhost:3000",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://dash.better-auth.com",
        "*.better-auth.com",
        "*.ngrok-free.app",
        "*.ngrok.io",
        "*.nip.io",
        "*.trycloudflare.com",
        "*.loca.lt",
    ],
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
            jwks: schema.jwks,
        },
    }),
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    await publisherService.publishUserEvent('USER_CREATED', user);
                }
            },
            update: {
                after: async (user) => {
                    await publisherService.publishUserEvent('USER_UPDATED', user);
                }
            },
            delete: {
                after: async (user) => {
                    await publisherService.publishUserEvent('USER_DELETED', user);
                }
            }
        },
        session: {
            create: {
                after: async (session) => {
                    console.log(`🛠️ [AuthService:Hook] session.create.after for user: ${session.userId}`);

                    // Fetch user details to include in JWT
                    const user = await db.query.user.findFirst({
                        where: eq(schema.user.id, session.userId)
                    });

                    if (user) {
                        const authToken = generateJWT({
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: user.role,
                            sessionId: session.id
                        });
                        const refreshToken = generateRefreshToken();

                        console.log(`✅ [AuthService:Hook] Generated authToken and refreshToken for persistence`);

                        // Manually update the DB to ensure these fields are saved
                        const [updatedSession] = await db.update(schema.session)
                            .set({ authToken, refreshToken })
                            .where(eq(schema.session.id, session.id))
                            .returning();

                        const userPayload = {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            image: user.image
                        };

                        // Ensure downstream services have the latest user record before session creation
                        await publisherService.publishUserEvent('USER_UPDATED', user);

                        if (updatedSession) {
                            console.log(`💾 [AuthService:Hook] Custom tokens persisted to DB`);
                            await publisherService.publishUserEvent('SESSION_CREATED' as any, { ...updatedSession, user: userPayload });
                        } else {
                            console.error(`❌ [AuthService:Hook] Failed to persist custom tokens to DB!`);
                            // Fallback to publishing with generated tokens anyway
                            await publisherService.publishUserEvent('SESSION_CREATED' as any, { ...session, authToken, refreshToken, user: userPayload });
                        }
                    } else {
                        console.warn(`⚠️ [AuthService:Hook] User not found during session creation after!`);
                        await publisherService.publishUserEvent('SESSION_CREATED' as any, session);
                    }
                }
            },
            delete: {
                after: async (session) => {
                    await publisherService.publishUserEvent('SESSION_DELETED' as any, session);
                }
            }
        }
    },
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        resetPasswordTokenExpiresIn: 60 * 60,
        // Signing in with a fresh password should end every other session —
        // whoever triggered the reset may not have been the only one in.
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: async ({ user, url, token }) => {
            await publishMail({
                type: "mail.password_reset",
                data: { to: user.email, name: user.name, url: resetLinkFor(url, token) },
            });
        },
    },
    user: {
        deleteUser: {
            enabled: true,
        },
    },
    // Better Auth only rate-limits in production by default; the reset and
    // sign-in endpoints are worth guarding everywhere.
    rateLimit: {
        enabled: true,
        window: 60,
        max: 120,
        customRules: {
            "/sign-in/email": { window: 60, max: 10 },
            "/sign-up/email": { window: 60, max: 5 },
            "/request-password-reset": { window: 15 * 60, max: 5 },
            "/reset-password": { window: 15 * 60, max: 10 },
        },
    },
    socialProviders: {
        github: {
            clientId: env.GITHUB_CLIENT_ID || "",
            clientSecret: env.GITHUB_CLIENT_SECRET || "",
        },
        google: {
            clientId: env.GOOGLE_CLIENT_ID || "",
            clientSecret: env.GOOGLE_CLIENT_SECRET || "",
            scope: ["openid", "email", "profile"],
            prompt: "select_account",
            getUserInfo: async (token: any) => {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${token.accessToken}` },
                });
                const profile = await res.json() as any;
                const name =
                    profile.name ||
                    `${profile.given_name ?? ''} ${profile.family_name ?? ''}`.trim() ||
                    profile.email?.split('@')[0] ||
                    'User';
                return {
                    user: {
                        id: profile.sub,
                        name,
                        email: profile.email,
                        image: profile.picture,
                        emailVerified: profile.email_verified ?? false,
                    },
                    data: profile,
                };
            },
        }
    },
    plugins: [
        bearer(), // Enable bearer token support for headers
        username(), // Enable username support
        dash({
            apiKey: env.BETTER_AUTH_API_KEY
        }), // Enable BetterAuth Dashboard support
        admin(), // Enable Admin management
        {
            id: "custom-tokens",
            schema: {
                session: {
                    fields: {
                        authToken: {
                            type: "string",
                        },
                        refreshToken: {
                            type: "string",
                        },
                    },
                },
            },
        },
    ],
});
