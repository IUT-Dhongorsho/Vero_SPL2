import api from '../api/client';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed';
  inviteCode?: string;
  memberCount: number;
  userRole: 'admin' | 'member' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  name: string;
  description: string;
}

export const projectService = {
  async getProjects(): Promise<Project[]> {
    const response = await api.get('/project/projects');
    return response.data;
  },

  async getProject(id: string): Promise<Project> {
    const response = await api.get(`/project/projects/${id}`);
    return response.data;
  },

  async createProject(data: CreateProjectData): Promise<Project> {
    const response = await api.post('/project/projects', data);
    return response.data;
  },

  async updateProject(id: string, data: Partial<CreateProjectData> & { status?: string }): Promise<Project> {
    const response = await api.patch(`/project/projects/${id}`, data);
    return response.data;
  },

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/project/projects/${id}`);
  },

  async joinProject(inviteCode: string): Promise<{ projectId: string }> {
    const response = await api.post('/project/projects/join', { inviteCode });
    return response.data;
  },

  async generateInviteCode(id: string): Promise<Project> {
    const response = await api.post(`/project/projects/${id}/invite-code`);
    return response.data;
  },
};
