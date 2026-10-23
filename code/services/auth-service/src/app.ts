import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth, derivedBasePath } from "./services/auth.service.js";
import { env } from "./config/env.js";

import { verifyController } from "./controllers/verify.controller.js";
import { getProfileController, updateProfileController } from "./controllers/user.controller.js";
import { authController } from "./controllers/auth.controller.js";
import { loggerMiddleware } from "./middleware/logger.js";
import { metricsMiddleware } from "./middleware/monitor.middleware.js";
import { metricsController } from "./controllers/metrics.controller.js";

const app = express();

app.use(loggerMiddleware);
app.use(metricsMiddleware);

// Enable CORS for frontend, dash.better-auth.com, tunnels, and local dev
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, or server-to-server calls from Dash)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            env.CLIENT_URL,
            process.env.CLIENT_URL,
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
            "https://dash.better-auth.com",
        ].filter(Boolean);

        if (
            allowedOrigins.includes(origin) ||
            origin.endsWith(".better-auth.com") ||
            origin.endsWith(".ngrok-free.app") ||
            origin.endsWith(".ngrok.io") ||
            origin.endsWith(".trycloudflare.com") ||
            origin.includes("nip.io") ||
            origin.includes("localhost")
        ) {
            return callback(null, true);
        }

        return callback(null, true);
    },
    credentials: true,
}));

app.use(express.json());

// BetterAuth handler
// Determine the base path that Better Auth expects (e.g. /api/better-auth)
const betterAuthHandler = toNodeHandler(auth);

// Handle BetterAuth routes:
// Frontend sends to /api/better-auth/* or /better-auth/*.
// Dash verification sends requests to base URL + base path (e.g. /api/better-auth/dash/validate).
// We normalize incoming paths to ensure they match Better Auth's expected basePath.
app.all([
    "/api/better-auth",
    "/api/better-auth/*",
    "/better-auth",
    "/better-auth/*",
    "/api/auth",
    "/api/auth/*",
    "/dash",
    "/dash/*",
], (req, res) => {
    // Sanitize duplicate X-Forwarded headers (e.g., "https, https" from ngrok + proxies)
    // which otherwise crash better-auth's underlying URL parser.
    if (req.headers['x-forwarded-proto'] && typeof req.headers['x-forwarded-proto'] === 'string') {
        req.headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'].split(',')[0].trim();
    }
    if (req.headers['x-forwarded-host'] && typeof req.headers['x-forwarded-host'] === 'string') {
        req.headers['x-forwarded-host'] = req.headers['x-forwarded-host'].split(',')[0].trim();
    }

    // Align incoming request paths with Better Auth's expected basePath
    if (req.url.startsWith('/api/better-auth')) {
        req.url = req.url.replace('/api/better-auth', derivedBasePath);
    } else if (req.url.startsWith('/better-auth')) {
        req.url = req.url.replace('/better-auth', derivedBasePath);
    } else if (req.url.startsWith('/api/auth')) {
        req.url = req.url.replace('/api/auth', derivedBasePath);
    } else if (req.url.startsWith('/dash')) {
        req.url = derivedBasePath + req.url;
    }
    req.originalUrl = req.url;

    betterAuthHandler(req, res);
});

// Core Session & JWT Entry point (Modular HS256)
app.get("/auth/session", authController.getSession);

// User Profile routes
app.get("/user/profile", getProfileController);
app.patch("/user/profile", updateProfileController);

// Internal verification endpoint for other microservices
app.get("/internal/verify", verifyController);

app.get("/metrics", metricsController.getMetrics);
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "auth-service" });
});

app.listen(env.PORT, () => {
    console.log(`🚀 Auth service running on port ${env.PORT}`);
});
