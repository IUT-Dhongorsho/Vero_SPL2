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

import { publisherService } from "./publisher.service.js";

export const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: ["http://localhost:3000"],
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

                        if (updatedSession) {
                            console.log(`💾 [AuthService:Hook] Custom tokens persisted to DB`);
                            await publisherService.publishUserEvent('SESSION_CREATED' as any, updatedSession);
                        } else {
                            console.error(`❌ [AuthService:Hook] Failed to persist custom tokens to DB!`);
                            // Fallback to publishing with generated tokens anyway
                            await publisherService.publishUserEvent('SESSION_CREATED' as any, { ...session, authToken, refreshToken });
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
        enabled: true
    },
    socialProviders: {
        github: {
            clientId: env.GITHUB_CLIENT_ID || "",
            clientSecret: env.GITHUB_CLIENT_SECRET || "",
        },
        google: {
            clientId: env.GOOGLE_CLIENT_ID || "",
            clientSecret: env.GOOGLE_CLIENT_SECRET || "",
        }
    },
    plugins: [
        bearer(), // Enable bearer token support for headers
        username(), // Enable username support
        dash(), // Enable BetterAuth Dashboard support
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
