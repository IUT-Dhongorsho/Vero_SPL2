import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./services/auth.service.js";
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
app.use(express.json());

// BetterAuth handler
app.all(["/api/better-auth/*", "/better-auth/*"], (req, res, next) => {
    // If request comes through Nginx, it strips '/api' -> '/better-auth/...'
    // If request comes directly (e.g. ngrok to 8001), it keeps '/api/better-auth/...'
    if (!req.url.startsWith('/api')) {
        req.url = '/api' + req.url;
    }
    
    // Sanitize duplicate X-Forwarded headers (e.g., "https, https" from ngrok + proxies)
    // which otherwise crash better-auth's underlying URL parser.
    if (req.headers['x-forwarded-proto'] && typeof req.headers['x-forwarded-proto'] === 'string') {
        req.headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'].split(',')[0].trim();
    }
    if (req.headers['x-forwarded-host'] && typeof req.headers['x-forwarded-host'] === 'string') {
        req.headers['x-forwarded-host'] = req.headers['x-forwarded-host'].split(',')[0].trim();
    }

    toNodeHandler(auth)(req, res);
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
