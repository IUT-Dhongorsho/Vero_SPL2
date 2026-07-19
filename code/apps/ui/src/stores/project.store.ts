import { create } from 'zustand';
import { projectService, Project, CreateProjectData } from '../services/projectService';

interface ProjectState {
  projects: Project[];
  loading: boolean;
  fetchProjects: () => Promise<void>;
  createProject: (data: CreateProjectData) => Promise<void>;
  joinProject: (inviteCode: string) => Promise<{ projectId: string }>;
  generateInviteCode: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const projects = await projectService.getProjects();
      set({ projects, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createProject: async (data) => {
    const newProj = await projectService.createProject(data);
    set({ projects: [...get().projects, newProj] });
  },

  joinProject: async (inviteCode) => {
    const res = await projectService.joinProject(inviteCode);
    await get().fetchProjects(); // Refresh the list
    return res;
  },

  generateInviteCode: async (id) => {
    const updatedProject = await projectService.generateInviteCode(id);
    set({ projects: get().projects.map(p => p.id === id ? { ...p, inviteCode: updatedProject.inviteCode } : p) });
  },

  deleteProject: async (id) => {
    await projectService.deleteProject(id);
    set({ projects: get().projects.filter(p => p.id !== id) });
  },
}));
