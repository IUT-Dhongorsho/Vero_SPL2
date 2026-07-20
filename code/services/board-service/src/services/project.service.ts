import { db } from '../db/client.js';
import { projects } from '../models/project.model.js';
import { eq } from 'drizzle-orm';
import { columnService } from './column.service.js';

export interface CreateProjectInput {
  name: string;
  description?: string;
  workspaceId?: string;
  ownerId: string;
}

export const projectService = {
  async getProjectsByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));
  },

  async getProjectById(id: string) {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project || null;
  },

  async createProject(input: CreateProjectInput & { id?: string }) {
    const values: Record<string, any> = {
      name: input.name,
      description: input.description || '',
      ownerId: input.ownerId,
    };
    if (input.id) values.id = input.id;
    if (input.workspaceId) values.workspaceId = input.workspaceId;

    const [project] = await db
      .insert(projects)
      .values(values)
      .returning();

    await columnService.initializeBoard(project.id);

    return project;
  },
};
