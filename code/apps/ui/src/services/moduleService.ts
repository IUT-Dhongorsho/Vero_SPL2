import { apiClient as api } from '../utils/apiClient';
import type { ProjectRole } from './projectService';

export type ModuleStatus = 'on-track' | 'at-risk' | 'off-track' | 'completed';

export interface ModuleMemberRef {
  userId: string;
  joinedAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

export interface Module {
  id: string;
  name: string;
  description: string | null;
  projectId: string;
  status: ModuleStatus;
  chatResourceId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Member count in lists. */
  members: number;
  isMember: boolean;
  memberPreview: ModuleMemberRef[];
}

export interface ModuleDetail extends Omit<Module, 'members' | 'memberPreview'> {
  project: { id: string; name: string } | null;
  userRole: ProjectRole;
  members: ModuleMemberRef[];
}

export interface ModuleRef {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  role: ProjectRole;
}

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

  async getModule(moduleId: string): Promise<ModuleDetail> {
    const response = await api.get(`/project/modules/${moduleId}`);
    return response.data;
  },

  /** Every module in every project you are on. */
  async mine(): Promise<ModuleRef[]> {
    const response = await api.get('/project/modules/mine');
    return response.data;
  },

  async createModule(data: CreateModuleData): Promise<Module> {
    const response = await api.post('/project/modules', data);
    return response.data;
  },

  async updateModule(moduleId: string, data: Partial<{ name: string; description: string; status: ModuleStatus }>): Promise<Module> {
    const response = await api.patch(`/project/modules/${moduleId}`, data);
    return response.data;
  },

  async deleteModule(moduleId: string): Promise<void> {
    await api.delete(`/project/modules/${moduleId}`);
  },

  async addMembers(moduleId: string, userIds: string[]): Promise<{ added: number }> {
    const response = await api.post(`/project/modules/${moduleId}/members`, { userIds });
    return response.data;
  },

  async join(moduleId: string): Promise<void> {
    await api.post(`/project/modules/${moduleId}/join`);
  },

  async removeMember(moduleId: string, userId: string): Promise<void> {
    await api.delete(`/project/modules/${moduleId}/members/${userId}`);
  },
};
