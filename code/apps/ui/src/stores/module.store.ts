import { create } from 'zustand';

import { moduleService, CreateModuleData, type Module } from '../services/moduleService';

export type { Module };

interface ModuleState {
  modules: Module[];
  /** The project `modules` belong to, so a stale list is never shown for another. */
  projectId: string | null;
  loading: boolean;
  fetchModules: (projectId: string) => Promise<void>;
  createModule: (data: CreateModuleData) => Promise<Module>;
}

export const useModuleStore = create<ModuleState>((set, get) => ({
  modules: [],
  projectId: null,
  loading: false,
  fetchModules: async (projectId: string) => {
    if (get().projectId !== projectId) set({ modules: [], projectId });
    set({ loading: true });
    try {
      const modules = await moduleService.getModules(projectId);
      if (get().projectId === projectId) set({ modules, loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },
  createModule: async (data: CreateModuleData) => {
    const newModule = await moduleService.createModule(data);
    set({ modules: [...get().modules, { ...newModule, memberPreview: newModule.memberPreview ?? [] }] });
    return newModule;
  },
}));
