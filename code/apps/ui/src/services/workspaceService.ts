import { mockWorkspaces, Workspace } from '../data/mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface CreateWorkspaceData {
  name: string;
  description: string;
  projectId: string;
}

export const workspaceService = {
  async getWorkspaces(projectId: string): Promise<Workspace[]> {
    await delay(500);
    return mockWorkspaces.filter(w => w.projectId === projectId);
  },

  async createWorkspace(data: CreateWorkspaceData): Promise<Workspace> {
    await delay(800);
    const newWorkspace: Workspace = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description,
      cardCount: 0,
      members: 1,
      projectId: data.projectId,
    };
    console.log('Created workspace:', newWorkspace);
    return newWorkspace;
  },

  async deleteWorkspace(id: string): Promise<void> {
    await delay(500);
    console.log('Deleted workspace:', id);
  },
};
