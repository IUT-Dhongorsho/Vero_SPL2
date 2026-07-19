import api from '../api/client';
import { Module } from '../stores/module.store';

export interface CreateModuleData {
  name: string;
  description: string;
  projectId: string;
}

export const moduleService = {
  async getModules(projectId: string): Promise<Module[]> {
    const response = await api.get(`/project/projects/${projectId}/modules`);
    return response.data;
  },

  async createModule(data: CreateModuleData): Promise<Module> {
    const response = await api.post('/project/modules', data);
    return response.data;
  },

  async updateModule(moduleId: string, data: Partial<CreateModuleData>): Promise<Module> {
    const response = await api.patch(`/project/modules/${moduleId}`, data);
    return response.data;
  },

  async deleteModule(moduleId: string): Promise<void> {
    await api.delete(`/project/modules/${moduleId}`);
  },
};
