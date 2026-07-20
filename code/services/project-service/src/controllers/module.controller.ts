import { Request, Response } from 'express';
import { db } from '../db/client.js';
import { projects, modules, projectMembers, moduleMembers } from '../models/workspace.model.js';
import { eq, and } from 'drizzle-orm';
import { queueService } from '../services/queue.service.js';

export class ModuleController {
  /**
   * Creates a new module within a project.
   * This triggers the orchestration of functional resources (Chat, etc.)
   */
  async createModule(req: Request, res: Response) {
    try {
      const { name, description, projectId } = req.body;
      const userId = (req as any).user.id;

      // 1. Authorization: User must be an admin of the project
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
        description,
        projectId,
        type: 'general',
      }).returning();

      // 4. Automatically add all project admins to the moduleMembers table
      const projectAdmins = await db.query.projectMembers.findMany({
        where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.role, 'admin'))
      });

      if (projectAdmins.length > 0) {
        await db.insert(moduleMembers).values(
          projectAdmins.map(admin => ({
            moduleId: newModule.id,
            userId: admin.userId,
            projectMemberId: admin.id,
          }))
        );
      }

      // 5. Trigger Resource Orchestration (Async via Queue)
      try {
        await queueService.queueModuleProvisioning({
            moduleId: newModule.id,
            name: newModule.name,
            projectId: project.id,
            workspaceId: (project as any).workspaceId || '',
        });
        console.log(`✨ [ModuleController] Module created and orchestration queued: ${newModule.id}`);
      } catch (queueErr) {
        console.warn(`⚠️ [ModuleController] Module created but queue failed:`, queueErr);
      }

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
        with: {
          members: true
        }
      });
      res.json(results.map((m: any) => ({ ...m, members: m.members.length })));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch modules' });
    }
  }
  async updateModule(req: Request, res: Response) {
    try {
      const { moduleId } = req.params;
      const { name, description, status } = req.body;
      
      // Should verify project membership here in a real scenario
      const [updated] = await db.update(modules)
        .set({ name, updatedAt: new Date() })
        .where(eq(modules.id, moduleId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update module' });
    }
  }

  async deleteModule(req: Request, res: Response) {
    try {
      const { moduleId } = req.params;
      
      // Should verify project membership here in a real scenario
      await db.delete(modules).where(eq(modules.id, moduleId));
      
      res.json({ success: true, message: 'Module deleted' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete module' });
    }
  }
}

export const moduleController = new ModuleController();
