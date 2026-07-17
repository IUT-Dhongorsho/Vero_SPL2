import api from '../api/client';
import { mockProjects as initialMockProjects } from '../data/mockData';

// ============================================================
// TOGGLE THIS FLAG:
// true  = use mock data (no backend needed)
// false = use real API calls (backend required)
// ============================================================
const USE_MOCK = true;

export interface Project {
  id: string;
  name: string;
  description: string;
  members: number;
  lastActive: string;
  status: 'active' | 'review' | 'completed';
}

export interface CreateProjectData {
  name: string;
  description: string;
  visibility?: 'private' | 'team';
}

// Mutable mock data store (for mock mode only)
let mockProjectData: Project[] = initialMockProjects.map(p => ({
  id: p.id,
  name: p.name,
  description: p.description,
  members: p.members,
  lastActive: p.lastActive,
  status: p.status,
}));

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const projectService = {
  async getProjects(): Promise<Project[]> {
    if (USE_MOCK) {
      await delay(500);
      return [...mockProjectData];
    } else {
      const response = await api.get('/projects');
      return response.data;
    }
  },

  async getProject(id: string): Promise<Project> {
    if (USE_MOCK) {
      await delay(300);
      const project = mockProjectData.find(p => p.id === id);
      if (!project) throw new Error('Project not found');
      return { ...project };
    } else {
      const response = await api.get(`/projects/${id}`);
      return response.data;
    }
  },

  async createProject(data: CreateProjectData): Promise<Project> {
    if (USE_MOCK) {
      await delay(800);
      const newProject: Project = {
        id: Date.now().toString(),
        name: data.name,
        description: data.description,
        members: 1,
        lastActive: 'Just now',
        status: 'active',
      };
      mockProjectData.push(newProject);
      console.log('Mock: Created project', newProject);
      return { ...newProject };
    } else {
      const response = await api.post('/projects', data);
      return response.data;
    }
  },

  async updateProject(id: string, data: Partial<CreateProjectData>): Promise<Project> {
    if (USE_MOCK) {
      await delay(500);
      const index = mockProjectData.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Project not found');
      const updated = { ...mockProjectData[index], ...data };
      mockProjectData[index] = updated;
      console.log('Mock: Updated project', updated);
      return { ...updated };
    } else {
      const response = await api.put(`/projects/${id}`, data);
      return response.data;
    }
  },

  async deleteProject(id: string): Promise<void> {
    if (USE_MOCK) {
      await delay(500);
      mockProjectData = mockProjectData.filter(p => p.id !== id);
      console.log('Mock: Deleted project', id);
    } else {
      await api.delete(`/projects/${id}`);
    }
  },
};
