import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

// Get the API base URL from env variables, fallback to same-origin /api
const baseURL = import.meta.env.VITE_API_URL || '/api';

/**
 * Singleton Axios instance for making authenticated API requests.
 */
export const apiClient = axios.create({
  baseURL,
  // Better Auth authenticates with an HttpOnly session cookie. Same-origin
  // requests would send it anyway, but this keeps things working when
  // VITE_API_URL points at another host.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request Interceptor: Automatically attach the bearer token to every request
apiClient.interceptors.request.use(
  (config) => {
    const { token, user } = useAuthStore.getState();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Send user ID header for dev-mode services that use fake auth
    if (user?.id) {
      config.headers['X-User-Id'] = user.id;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle auth failures (e.g. 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Only kick out the user if the primary auth endpoint itself returned 401
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/better-auth') || url.includes('/auth/session') || url.includes('/auth/me');

      if (isAuthEndpoint) {
        console.warn('⚠️ [apiClient] Primary auth session returned 401. Clearing local auth state...');
        useAuthStore.getState().clearAuth();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else {
        console.warn(`⚠️ [apiClient] Request to ${url} returned 401 Unauthorized. Preserving active session.`);
      }
    }
    
    return Promise.reject(error);
  }
);
