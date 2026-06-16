import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  githubHandle?: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token, isAuthenticated: !!token }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'auth-storage', // key name in localStorage
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);