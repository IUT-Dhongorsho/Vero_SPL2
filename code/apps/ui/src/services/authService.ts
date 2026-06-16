import { authClient } from '../utils/auth';
import { useAuthStore } from '../stores/auth.store';
import type { User } from '../stores/auth.store';

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

export const authService = {
  // Credentials login using Better-Auth client
  async login(data: LoginData): Promise<{ user: User; token: string }> {
    const { data: authData, error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });

    if (error) {
      throw new Error(error.message || 'Credentials authentication failed');
    }

    if (!authData) {
      throw new Error('Authentication returned empty response');
    }

    const token = (authData as any).session?.authToken;
    if (!token) {
      throw new Error('Failed to retrieve custom stateless JWT');
    }

    const user: User = {
      id: authData.user.id,
      name: authData.user.name,
      email: authData.user.email,
      avatar: authData.user.image || undefined,
    };

    // Update the Zustand store immediately
    useAuthStore.getState().setAuth(user, token);

    return { user, token };
  },

  // Initiate Social Login redirect using Better-Auth client
  async loginWithSocial(provider: 'github' | 'google'): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: `${appUrl}/auth/callback/`,
    });

    if (error) {
      throw new Error(error.message || `Failed to initiate login with ${provider}`);
    }
  },

  // Credentials signup using Better-Auth client
  async signup(data: SignupData): Promise<{ user: User; token: string }> {
    const { data: authData, error } = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: data.name,
    });

    if (error) {
      throw new Error(error.message || 'Signup failed');
    }

    if (!authData) {
      throw new Error('Signup returned empty response');
    }

    const token = (authData as any).session?.authToken;
    if (!token) {
      throw new Error('Failed to retrieve custom stateless JWT');
    }

    const user: User = {
      id: authData.user.id,
      name: authData.user.name,
      email: authData.user.email,
      avatar: authData.user.image || undefined,
    };

    // Update the Zustand store immediately
    useAuthStore.getState().setAuth(user, token);

    return { user, token };
  },

  async logout(): Promise<void> {
    try {
      await authClient.signOut();
    } catch (err) {
      console.error('Error during Better-Auth signout:', err);
    }
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
