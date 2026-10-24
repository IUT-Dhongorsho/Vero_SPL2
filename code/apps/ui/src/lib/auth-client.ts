import { createAuthClient } from "better-auth/react";
import { API_BASE } from "./endpoints";

export const authClient = createAuthClient({
  baseURL: `${API_BASE}/better-auth`,
  fetchOptions: {
    // ngrok serves an interstitial page to browsers without this header.
    headers: { "ngrok-skip-browser-warning": "true" },
  },
});
