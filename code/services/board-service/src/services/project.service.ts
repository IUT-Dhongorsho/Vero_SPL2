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
  /**
   * board-service keeps a thin replica of projects so `columns.project_id` has
   * something to point at. Projects are owned by project-service, so the first
   * time a board is opened we materialise the row here instead of failing on
   * the foreign key.
   */
  async ensureProjectReplica(id: string, input: { name?: string; ownerId?: string } = {}) {
    const [existing] = await db.select().from(projects).where(eq(projects.id, id));
    if (existing) return existing;

    const [created] = await db
      .insert(projects)
      .values({
        id,
        name: input.name?.slice(0, 255) || 'Project',
        description: '',
        ownerId: input.ownerId || 'unknown',
      })
      .onConflictDoNothing()
      .returning();

    if (created) return created;

    // Lost a race with a concurrent initialise — re-read.
    const [raced] = await db.select().from(projects).where(eq(projects.id, id));
    return raced ?? null;
  },

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
