import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_AUTH_SERVICE_URL || "http://localhost:8001",
});
