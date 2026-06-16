import express from "express";
import cors from "cors";
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
app.use(cors({
    origin: [process.env.CLIENT_URL!, 'http://localhost:5173'], // Or your specific frontend URL
    credentials: true,               // Essential for BetterAuth cookies
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));
app.use(express.json());

// BetterAuth handler
app.all("/api/auth/*", toNodeHandler(auth));

// Core Session & JWT Entry point (Modular HS256)
app.get("/api/auth/session", authController.getSession);

// User Profile routes
app.get("/api/user/profile", getProfileController);
app.patch("/api/user/profile", updateProfileController);

// Internal verification endpoint for other microservices
app.get("/api/internal/verify", verifyController);

app.get("/metrics", metricsController.getMetrics);
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "auth-service" });
});

app.listen(env.PORT, () => {
    console.log(`🚀 Auth service running on port ${env.PORT}`);
});
