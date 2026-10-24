import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';
import { API_BASE } from '../lib/endpoints';

/**
 * Singleton Axios instance for making authenticated API requests.
 */
export const apiClient = axios.create({
  baseURL: API_BASE,
  // Better Auth authenticates with an HttpOnly session cookie. Same-origin
  // requests would send it anyway, but this keeps things working when
  // VITE_API_URL points at another host.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    // ngrok serves an interstitial page to browsers without this header.
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request Interceptor: Automatically attach the bearer token to every request
apiClient.interceptors.request.use(
  (config) => {
    const { token } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: only a 401 from the auth endpoints themselves ends
// the session — one service briefly failing to verify must not log you out.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/better-auth') || url.includes('/auth/session') || url.includes('/auth/me');

      if (isAuthEndpoint) {
        useAuthStore.getState().clearAuth();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
