import { Request, Response } from 'express';
import { db } from '../db/client.js';
import { workspaces } from '../models/workspace.model.js';
import { eq } from 'drizzle-orm';

export class WorkspaceController {
  /**
   * Lists all workspaces owned by the user.
   */
  async getMyWorkspaces(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const results = await db.query.workspaces.findMany({
        where: eq(workspaces.ownerId, userId),
        with: {
          projects: true
        }
      });
      res.json(results);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
  }

  /**
   * Gets a specific workspace with its projects.
   */
  async getWorkspaceById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, id),
        with: {
          projects: true
        }
      });

      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Check ownership (Simplified for now)
      if (workspace.ownerId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to workspace' });
      }

      res.json(workspace);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch workspace' });
    }
  }
}

export const workspaceController = new WorkspaceController();
