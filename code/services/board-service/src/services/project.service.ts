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
  /**
   * board-service keeps a thin replica of projects so `columns.project_id` has
   * something to point at. Projects are owned by project-service, so the first
   * time a board is opened we materialise the row here instead of failing on
   * the foreign key.
   */
  async ensureProjectReplica(
    id: string,
    input: { name?: string; ownerId?: string; parentProjectId?: string; parentProjectName?: string } = {}
  ) {
    const [existing] = await db.select().from(projects).where(eq(projects.id, id));
    if (existing) {
      // Modules and projects get renamed; refresh the copy when it drifts.
      const name = input.name?.slice(0, 255);
      const parentName = input.parentProjectName?.slice(0, 255);
      if (
        (name && name !== existing.name) ||
        (input.parentProjectId && input.parentProjectId !== existing.parentProjectId) ||
        (parentName && parentName !== existing.parentProjectName)
      ) {
        const [refreshed] = await db
          .update(projects)
          .set({
            name: name || existing.name,
            parentProjectId: input.parentProjectId ?? existing.parentProjectId,
            parentProjectName: parentName ?? existing.parentProjectName,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, id))
          .returning();
        return refreshed;
      }
      return existing;
    }

    const [created] = await db
      .insert(projects)
      .values({
        id,
        name: input.name?.slice(0, 255) || 'Project',
        description: '',
        ownerId: input.ownerId || 'unknown',
        parentProjectId: input.parentProjectId ?? null,
        parentProjectName: input.parentProjectName?.slice(0, 255) ?? null,
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
      .values(values as any)
      .returning();

    await columnService.initializeBoard(project.id);

    return project;
  },
};
