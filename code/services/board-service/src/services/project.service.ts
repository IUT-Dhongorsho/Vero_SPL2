import { db } from '../db/client.js';
import { projects } from '../models/project.model.js';
import { eq } from 'drizzle-orm';
import { columnService } from './column.service.js';

export interface CreateProjectInput {
  name: string;
  description?: string;
  workspaceId: string;
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

  async createProject(input: CreateProjectInput) {
    const [project] = await db
      .insert(projects)
      .values({
        name: input.name,
        description: input.description || '',
        workspaceId: input.workspaceId,
        ownerId: input.ownerId,
      })
      .returning();

    await columnService.initializeBoard(project.id);

    return project;
  },
};
