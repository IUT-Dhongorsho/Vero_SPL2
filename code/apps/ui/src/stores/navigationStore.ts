import { create } from 'zustand';

interface NavigationState {
  currentProjectId: string | null;
  currentWorkspaceId: string | null;
  setCurrentProject: (id: string) => void;
  setCurrentWorkspace: (id: string) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentProjectId: null,
  currentWorkspaceId: null,
  setCurrentProject: (id) => set({ currentProjectId: id }),
  setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),
}));
