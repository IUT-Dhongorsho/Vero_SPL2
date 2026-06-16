import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

// Get the API base URL from env variables, fallback to local development port
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8004';

/**
 * Singleton Axios instance for making authenticated API requests.
 */
export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically attach the bearer token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle auth failures (e.g. 401 Unauthorized) globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Check if the server responded with 401 Unauthorized
    if (error.response && error.response.status === 401) {
      console.warn('⚠️ [apiClient] Request returned 401 Unauthorized. Clearing local auth state...');
      
      // Clean up local authentication state via Zustand store
      useAuthStore.getState().clearAuth();
      
      // Optionally redirect user to the login page
      if (typeof window !== 'undefined') {
        const loginUrl = '/login';
        if (window.location.pathname !== loginUrl) {
          window.location.href = loginUrl;
        }
      }
    }
    
    return Promise.reject(error);
  }
);
