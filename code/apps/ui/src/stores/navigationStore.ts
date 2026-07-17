import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NavigationState {
  currentProjectId: string | null;
  currentWorkspaceId: string | null;
  isSidebarCollapsed: boolean;
  setCurrentProject: (id: string) => void;
  setCurrentWorkspace: (id: string) => void;
  toggleSidebar: () => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      currentProjectId: null,
      currentWorkspaceId: null,
      isSidebarCollapsed: false,
      setCurrentProject: (id) => set({ currentProjectId: id }),
      setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    }),
    {
      name: 'navigation-storage',
      partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
    }
  )
);
