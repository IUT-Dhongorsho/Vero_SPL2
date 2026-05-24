import { Request, Response } from 'express';
import { db } from '../db/client.js';
import { projects, modules, projectMembers } from '../models/workspace.model.js';
import { eq, and } from 'drizzle-orm';
import { queueService } from '../services/queue.service.js';

export class ModuleController {
  /**
   * Creates a new module within a project.
   * This triggers the orchestration of functional resources (Chat, etc.)
   */
  async createModule(req: Request, res: Response) {
    try {
      const { name, projectId } = req.body;
      const userId = (req as any).user.id;

      // 1. Authorization: User must be an admin/member of the project
      const membership = await db.query.projectMembers.findFirst({
        where: and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, userId)
        )
      });

      if (!membership || membership.role !== 'admin') {
          return res.status(403).json({ error: 'Unauthorized: Only project admins can create modules' });
      }

      // 2. Fetch project details for workspaceId
      const project = await db.query.projects.findFirst({
          where: eq(projects.id, projectId)
      });

      if (!project) return res.status(404).json({ error: 'Project not found' });

      // 3. Create module locally
      const [newModule] = await db.insert(modules).values({
        name,
        projectId,
      }).returning();

      // 4. Trigger Resource Orchestration (Async via Queue)
      await queueService.queueModuleProvisioning({
          moduleId: newModule.id,
          name: newModule.name,
          projectId: project.id,
          workspaceId: project.workspaceId
      });

      console.log(`✨ [ModuleController] Module created and orchestration queued: ${newModule.id}`);
      res.status(201).json(newModule);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create module' });
    }
  }

  async getProjectModules(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const results = await db.query.modules.findMany({
        where: eq(modules.projectId, projectId),
      });
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch modules' });
    }
  }
}

export const moduleController = new ModuleController();
