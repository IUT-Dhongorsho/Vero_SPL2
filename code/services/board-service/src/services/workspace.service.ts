import { db } from '../db/client.js';
import { workspaces } from '../models/workspace.model.js';
import { eq } from 'drizzle-orm';

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  ownerId: string;
}

export const workspaceService = {
  async getWorkspacesByUser(userId: string) {
    return db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, userId));
  },

  async getWorkspaceById(id: string) {
    const [ws] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id));
    return ws || null;
  },

  async createWorkspace(input: CreateWorkspaceInput) {
    const [ws] = await db
      .insert(workspaces)
      .values({
        name: input.name,
        description: input.description || '',
        ownerId: input.ownerId,
      })
      .returning();
    return ws;
  },
};
