import { createAuthClient } from "better-auth/react";
import { API_BASE } from "./endpoints";

export const authClient = createAuthClient({
  baseURL: `${API_BASE}/better-auth`,
});
