import { create } from 'zustand';
import { projectService, Project, CreateProjectData } from '../services/projectService';

interface ProjectState {
  projects: Project[];
  loading: boolean;
  fetchProjects: () => Promise<void>;
  createProject: (data: CreateProjectData) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  fetchProjects: async () => {
    set({ loading: true });
    try {
      const projects = await projectService.getProjects();
      set({ projects, loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },
  createProject: async (data) => {
    const newProj = await projectService.createProject(data);
    set({ projects: [...get().projects, newProj] });
  }
}));
