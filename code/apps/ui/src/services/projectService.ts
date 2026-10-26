import { apiClient as api } from '../utils/apiClient';

export type ProjectRole = 'admin' | 'member' | 'viewer';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed';
  /** Present for admins only. */
  inviteCode?: string;
  memberCount: number;
  moduleCount?: number;
  userRole: ProjectRole;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
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

  async getMembers(id: string): Promise<ProjectMember[]> {
    const response = await api.get(`/project/projects/${id}/members`);
    return response.data;
  },

  async setMemberRole(id: string, userId: string, role: ProjectRole): Promise<void> {
    await api.patch(`/project/projects/${id}/members/${userId}`, { role });
  },

  /** Removes someone — or, with your own id, leaves the project. */
  async removeMember(id: string, userId: string): Promise<void> {
    await api.delete(`/project/projects/${id}/members/${userId}`);
  },
};
