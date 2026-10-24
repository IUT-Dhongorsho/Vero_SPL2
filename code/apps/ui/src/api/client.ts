// src/api/client.ts
import axios from 'axios';
import { authService } from '../services/authService';
import { Import } from 'lucide-react';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request interceptor: attach token
api.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/better-auth') || url.includes('/auth/session') || url.includes('/auth/me');

      if (isAuthEndpoint) {
        console.warn('⚠️ [api] Primary auth session returned 401. Logging out...');
        authService.removeToken();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else {
        console.warn(`⚠️ [api] Request to ${url} returned 401 Unauthorized. Preserving active session.`);
      }
    }
    return Promise.reject(error);
  }
);

export default api;