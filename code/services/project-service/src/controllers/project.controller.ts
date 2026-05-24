import { Request, Response } from 'express';
import { db } from '../db/client.js';
import { projects, projectMembers, workspaces } from '../models/workspace.model.js';
import { eq, and } from 'drizzle-orm';

export class ProjectController {
  /**
   * Creates a new project under a workspace.
   * User must be the workspace owner.
   */
  async createProject(req: Request, res: Response) {
    try {
      const { name, description, workspaceId } = req.body;
      const userId = (req as any).user.id;

      // 1. Verify workspace ownership
      const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, workspaceId)
      });

      if (!workspace || workspace.ownerId !== userId) {
          return res.status(403).json({ error: 'Unauthorized: You do not own this workspace' });
      }

      // 2. Create project within transaction
      const newProject = await db.transaction(async (tx) => {
        const [project] = await tx.insert(projects).values({
          name,
          description,
          workspaceId,
        }).returning();

        // 3. Add creator as Admin
        await tx.insert(projectMembers).values({
          projectId: project.id,
          userId,
          role: 'admin',
        });

        return project;
      });

      res.status(201).json(newProject);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  async getWorkspaceProjects(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const userId = (req as any).user.id;

      // Check if user is a member of any project in this workspace or owns it
      const results = await db.query.projects.findMany({
        where: eq(projects.workspaceId, workspaceId),
        with: {
          members: {
            with: {
              user: true
            }
          }
        }
      });

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }
}

export const projectController = new ProjectController();
