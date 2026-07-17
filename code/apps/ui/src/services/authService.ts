import { useAuthStore } from '../stores/auth.store';
import type { User } from '../stores/auth.store';
import { v4 as uuidv4 } from 'uuid';

export type { User };

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  githubHandle?: string;
}

// LOCAL ADAPTER — replace body with real HTTP/gRPC/WS call when backend is wired
export const authService = {
  async login(data: LoginData): Promise<{ user: User; token: string }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!data.email || !data.password) {
      throw new Error('Email and password are required');
    }

    // Fake successful login
    const user: User = {
      id: uuidv4(),
      name: data.email.split('@')[0],
      email: data.email,
      avatar: undefined, // Let the avatar be generated via initials or empty
    };

    const token = `fake-jwt-token-${uuidv4()}`;

    // Update the Zustand store immediately
    useAuthStore.getState().setAuth(user, token);

    return { user, token };
  },

  async loginWithSocial(provider: 'github' | 'google'): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Simulate redirect for social auth callback
    const appUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
    window.location.href = `${appUrl}/auth/callback?provider=${provider}&token=fake-token-${uuidv4()}`;
  },

  async signup(data: SignupData): Promise<{ user: User; token: string }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!data.email || !data.password || !data.name) {
      throw new Error('Please fill in all required fields');
    }

    // Fake successful signup
    const user: User = {
      id: uuidv4(),
      name: data.name,
      email: data.email,
      avatar: undefined,
    };

    const token = `fake-jwt-token-${uuidv4()}`;

    // Update the Zustand store immediately
    useAuthStore.getState().setAuth(user, token);

    return { user, token };
  },

  async logout(): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    useAuthStore.getState().clearAuth();
  },

  getToken(): string | null {
    return useAuthStore.getState().token;
  },

  setToken(token: string): void {
    useAuthStore.getState().setToken(token);
  },

  removeToken(): void {
    useAuthStore.getState().clearAuth();
  },

  getUser(): User | null {
    return useAuthStore.getState().user;
  },

  setUser(user: User): void {
    useAuthStore.getState().setUser(user);
  },

  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  },
};
