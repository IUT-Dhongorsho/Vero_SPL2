import { createAuthClient } from "better-auth/react";

const rawApiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
const apiBase = rawApiUrl.startsWith('http') ? rawApiUrl : `${origin}${rawApiUrl}`;

export const authClient = createAuthClient({
  baseURL: `${apiBase}/better-auth`,
  fetchOptions: {
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  },
});
