import { useAuthStore } from '../stores/auth.store';
import type { User } from '../stores/auth.store';
import { authClient } from '../lib/auth-client';

export type { User };

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
}

export const authService = {
  async login(data: LoginData): Promise<{ user: User; token: string }> {
    const { data: signInData, error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });

    if (error) {
      throw new Error(error.message || 'Login failed');
    }

    if (!signInData?.user) {
      throw new Error('User data missing from response');
    }

    const user: User = {
      id: signInData.user.id,
      name: signInData.user.name,
      email: signInData.user.email,
      avatar: signInData.user.image || undefined,
    };

    const token = signInData.token || 'session-active';

    useAuthStore.getState().setAuth(user, token);
    return { user, token };
  },

  async loginWithSocial(provider: 'github' | 'google'): Promise<void> {
    await authClient.signIn.social({
      provider,
      callbackURL: '/dashboard', 
    });
  },

  async signup(data: SignupData): Promise<{ user: User; token: string }> {
    const { data: signUpData, error } = await authClient.signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
    });

    if (error) {
      throw new Error(error.message || 'Signup failed');
    }

    if (!signUpData?.user) {
      throw new Error('User data missing from response');
    }

    const user: User = {
      id: signUpData.user.id,
      name: signUpData.user.name,
      email: signUpData.user.email,
      avatar: signUpData.user.image || undefined,
    };

    const token = signUpData.token || 'session-active';
    useAuthStore.getState().setAuth(user, token);

    return { user, token };
  },

  async logout(): Promise<void> {
    await authClient.signOut();
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
