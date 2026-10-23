import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./services/auth.service.js";
import { env } from "./config/env.js";

import { verifyController } from "./controllers/verify.controller.js";
import {
    getProfileController,
    getPublicProfileController,
    getUsersByIdsController,
    searchUsersController,
    updateProfileController,
} from "./controllers/user.controller.js";
import { activitySummaryController, heartbeatController } from "./controllers/activity.controller.js";
import {
    mailInboxController,
    mailMessageController,
    mailReplyController,
    mailStatusController,
} from "./controllers/mail.controller.js";
import { authController } from "./controllers/auth.controller.js";
import { loggerMiddleware } from "./middleware/logger.js";
import { requireSession } from "./middleware/session.js";
import { metricsMiddleware } from "./middleware/monitor.middleware.js";
import { metricsController } from "./controllers/metrics.controller.js";

const app = express();

app.use(
    cors({
        origin: (origin, callback) => callback(null, true),
        credentials: true,
    })
);
app.use(loggerMiddleware);
app.use(metricsMiddleware);

// BetterAuth handler
const betterAuthHandler = toNodeHandler(auth);

app.all(["/api/better-auth/*", "/better-auth/*", "/api/better-auth", "/better-auth", "/dash", "/dash/*"], (req, res) => {
    // Sanitize duplicate X-Forwarded headers (e.g., "https, https" from ngrok + proxies)
    // which otherwise crash better-auth's underlying URL parser.
    if (req.headers['x-forwarded-proto'] && typeof req.headers['x-forwarded-proto'] === 'string') {
        req.headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'].split(',')[0].trim();
    }
    if (req.headers['x-forwarded-host'] && typeof req.headers['x-forwarded-host'] === 'string') {
        req.headers['x-forwarded-host'] = req.headers['x-forwarded-host'].split(',')[0].trim();
    }

    if (!req.url.startsWith('/api/better-auth')) {
        if (req.url.startsWith('/better-auth')) {
            req.url = '/api' + req.url;
        } else if (req.url.startsWith('/dash')) {
            req.url = '/api/better-auth' + req.url;
        }
    }
    req.originalUrl = req.url;

    betterAuthHandler(req, res);
});

// Body parsing is mounted *after* the Better Auth handler, which needs the raw stream.
app.use(express.json({ limit: "2mb" }));

// Core Session & JWT Entry point (Modular HS256)
app.get("/auth/session", authController.getSession);

// User Profile routes
app.get("/user/profile", requireSession, getProfileController);
app.patch("/user/profile", requireSession, updateProfileController);

// Directory — used by the Inbox "add someone" search and member chips
app.get("/users/search", requireSession, searchUsersController);
app.get("/users/bulk", requireSession, getUsersByIdsController);
app.get("/users/:identifier", requireSession, getPublicProfileController);

// Presence / time-on-site metrics
app.post("/user/activity/heartbeat", requireSession, heartbeatController);
app.get("/user/activity/summary", requireSession, activitySummaryController);

// Gmail bridge for the dashboard mail widget
app.get("/mail/status", requireSession, mailStatusController);
app.get("/mail/inbox", requireSession, mailInboxController);
app.get("/mail/messages/:id", requireSession, mailMessageController);
app.post("/mail/messages/:id/reply", requireSession, mailReplyController);

// Internal verification endpoint for other microservices
app.get("/internal/verify", verifyController);

app.get("/metrics", metricsController.getMetrics);
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "auth-service" });
});

// Centralized Express error-handling middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(`❌ [Express Error] ${req.method} ${req.url}:`, err);
    res.status(err.status || 500).json({
        error: err.message || "Internal server error",
    });
});

app.listen(env.PORT, () => {
    console.log(`🚀 Auth service running on port ${env.PORT}`);
});
