import { mockProjects, Project } from '../data/mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface CreateProjectData {
  name: string;
  description: string;
  visibility: 'private' | 'team';
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  visibility?: 'private' | 'team';
}

export const projectService = {
  async getProjects(): Promise<Project[]> {
    await delay(500);
    return [...mockProjects];
  },

  async getProject(id: string): Promise<Project | undefined> {
    await delay(300);
    return mockProjects.find(p => p.id === id);
  },

  async createProject(data: CreateProjectData): Promise<Project> {
    await delay(800);
    const newProject: Project = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description,
      members: 1,
      lastActive: 'Just now',
      status: 'active',
    };
    console.log('Created project:', newProject);
    return newProject;
  },

  async updateProject(id: string, data: UpdateProjectData): Promise<Project> {
    await delay(500);
    const project = mockProjects.find(p => p.id === id);
    if (!project) throw new Error('Project not found');
    const updatedProject = { ...project, ...data };
    console.log('Updated project:', updatedProject);
    return updatedProject;
  },

  async deleteProject(id: string): Promise<void> {
    await delay(500);
    console.log('Deleted project:', id);
  },
};
