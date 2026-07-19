import { create } from 'zustand';

import { moduleService, CreateModuleData } from '../services/moduleService';

export interface Module {
  id: string;
  name: string;
  description: string;
  projectId: string;
  members?: number;
  status: 'on-track' | 'at-risk' | 'blocked';
}

interface ModuleState {
  modules: Module[];
  loading: boolean;
  fetchModules: (projectId: string) => Promise<void>;
  createModule: (data: CreateModuleData) => Promise<void>;
}

export const useModuleStore = create<ModuleState>((set, get) => ({
  modules: [],
  loading: false,
  fetchModules: async (projectId: string) => {
    set({ loading: true });
    try {
      const modules = await moduleService.getModules(projectId);
      set({ modules, loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },
  createModule: async (data: CreateModuleData) => {
    const newModule = await moduleService.createModule(data);
    set({ modules: [...get().modules, newModule] });
  }
}));
