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

/**
 * Better Auth returns the opaque session token at the top level on sign-in and
 * sign-up, but the JWT the microservices prefer only exists on the persisted
 * session. Re-read the session so we hand downstream services the better token
 * when it is available, and fall back to the opaque one when it is not.
 */
async function resolveSessionToken(fallback: string | undefined): Promise<string> {
  try {
    const { data } = await authClient.getSession();
    const session = data?.session as { authToken?: string; token?: string } | undefined;
    return session?.authToken || session?.token || fallback || 'session-active';
  } catch {
    return fallback || 'session-active';
  }
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

    const token = await resolveSessionToken(
      (signInData as any).token ?? (signInData as any).session?.token
    );

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

    const token = await resolveSessionToken(
      (signUpData as any).token ?? (signUpData as any).session?.token
    );
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
