import { create } from 'zustand';

export interface Module {
  id: string;
  name: string;
  description: string;
  projectId: string;
  members: number;
  status: 'on-track' | 'at-risk' | 'blocked';
}

interface ModuleState {
  modules: Module[];
  fetchModules: (projectId: string) => void;
}

export const useModuleStore = create<ModuleState>((set) => ({
  modules: [],
  fetchModules: (projectId: string) => {
    // Mock data for modules within a project
    set({
      modules: [
        { id: 'm1', name: 'Authentication System', description: 'OAuth2 and SSO integration', projectId, members: 3, status: 'on-track' },
        { id: 'm2', name: 'Payment Gateway', description: 'Stripe API integration and webhooks', projectId, members: 5, status: 'at-risk' },
        { id: 'm3', name: 'Admin Dashboard', description: 'Internal tool for managing users', projectId, members: 2, status: 'on-track' },
      ]
    });
  }
}));
