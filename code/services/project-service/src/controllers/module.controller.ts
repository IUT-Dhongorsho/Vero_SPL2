import { Request, Response } from 'express';
import { db } from '../db/client.js';
import { projects, modules, projectMembers, moduleMembers } from '../models/workspace.model.js';
import { eq, and, inArray } from 'drizzle-orm';
import { queueService } from '../services/queue.service.js';
import { accessService, AccessError, sendError } from '../services/access.service.js';
import { chatSyncService } from '../services/chat-sync.service.js';
import { publisherService } from '../services/publisher.service.js';

const MODULE_STATUSES = new Set(['on-track', 'at-risk', 'off-track', 'completed']);
const userIdOf = (req: Request) => (req as any).user.id as string;

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim().slice(0, max);
}

const memberView = (m: any) => ({
  userId: m.userId,
  joinedAt: m.joinedAt,
  user: { id: m.user.id, name: m.user.name, avatarUrl: m.user.avatarUrl ?? null },
});

export class ModuleController {
  /**
   * Creates a new module within a project.
   * This triggers the orchestration of functional resources (Chat, etc.)
   */
  async createModule(req: Request, res: Response) {
    try {
      const { projectId } = req.body ?? {};
      const name = cleanText(req.body?.name, 255);
      const description = cleanText(req.body?.description, 2000) ?? '';
      const userId = userIdOf(req);

      if (!projectId || !name) {
        throw new AccessError(400, 'A module needs a name', 'VALIDATION_FAILED');
      }

      // 1. Authorization: only project admins create modules
      await accessService.require(projectId, userId, 'manageModules');

      const project = await db.query.projects.findFirst({
          where: eq(projects.id, projectId)
      });

      if (!project) return res.status(404).json({ error: 'Project not found' });

      // 2. Create module locally
      const [newModule] = await db.insert(modules).values({
        name,
        description,
        projectId,
        type: 'general',
      }).returning();

      // 3. Project admins belong to every module they can manage
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

      // 4. Trigger Resource Orchestration (Async via Queue)
      try {
        await queueService.queueModuleProvisioning({
            moduleId: newModule.id,
            name: newModule.name,
            projectId: project.id,
            workspaceId: '',
        });
        console.log(`✨ [ModuleController] Module created and orchestration queued: ${newModule.id}`);
      } catch (queueErr) {
        console.warn(`⚠️ [ModuleController] Module created but queue failed:`, queueErr);
      }

      res.status(201).json({ ...newModule, members: projectAdmins.length, isMember: true });
    } catch (error) {
      sendError(res, error, 'Failed to create module');
    }
  }

  /**
   * GET /projects/:projectId/modules
   * Every module in the project, each with a short member preview and whether
   * the caller belongs to it.
   */
  async getProjectModules(req: Request, res: Response) {
    try {
      const projectId = String(req.params.projectId);
      const userId = userIdOf(req);
      await accessService.require(projectId, userId);

      const results = await db.query.modules.findMany({
        where: eq(modules.projectId, projectId),
        with: { members: { with: { user: true } } },
        orderBy: (m, { asc }) => [asc(m.createdAt)],
      });

      res.json(
        results.map(({ members, ...m }: any) => ({
          ...m,
          members: members.length,
          isMember: members.some((mm: any) => mm.userId === userId),
          memberPreview: members.slice(0, 4).map(memberView),
        }))
      );
    } catch (error) {
      sendError(res, error, 'Failed to fetch modules');
    }
  }

  /** GET /modules/:moduleId — the module, its members and the caller's standing. */
  async getModule(req: Request, res: Response) {
    try {
      const userId = userIdOf(req);
      const { module: mod, member } = await accessService.requireModule(String(req.params.moduleId), userId);

      const [project, members] = await Promise.all([
        db.query.projects.findFirst({ where: eq(projects.id, mod.projectId) }),
        db.query.moduleMembers.findMany({
          where: eq(moduleMembers.moduleId, mod.id),
          with: { user: true },
        }),
      ]);

      res.json({
        ...mod,
        project: project ? { id: project.id, name: project.name } : null,
        userRole: member.role,
        isMember: members.some((m) => m.userId === userId),
        members: members.map(memberView),
      });
    } catch (error) {
      sendError(res, error, 'Failed to fetch module');
    }
  }

  async updateModule(req: Request, res: Response) {
    try {
      const { module: mod } = await accessService.requireModule(
        String(req.params.moduleId),
        userIdOf(req),
        'manageModules'
      );

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      const name = cleanText(req.body?.name, 255);
      const description = cleanText(req.body?.description, 2000);
      const status = req.body?.status;

      if (name !== undefined) {
        if (!name) throw new AccessError(400, 'A module needs a name', 'VALIDATION_FAILED');
        patch.name = name;
      }
      if (description !== undefined) patch.description = description;
      if (status !== undefined) {
        if (!MODULE_STATUSES.has(status)) {
          throw new AccessError(400, 'Unknown module status', 'VALIDATION_FAILED');
        }
        patch.status = status;
      }

      const [updated] = await db.update(modules).set(patch).where(eq(modules.id, mod.id)).returning();
      res.json(updated);
    } catch (error) {
      sendError(res, error, 'Failed to update module');
    }
  }

  async deleteModule(req: Request, res: Response) {
    try {
      const { module: mod } = await accessService.requireModule(
        String(req.params.moduleId),
        userIdOf(req),
        'manageModules'
      );

      await db.delete(modules).where(eq(modules.id, mod.id));
      res.json({ success: true, message: 'Module deleted' });
    } catch (error) {
      sendError(res, error, 'Failed to delete module');
    }
  }

  /**
   * POST /modules/:moduleId/members  { userIds }
   * Admins add project members to a module; their chat access follows.
   */
  async addMembers(req: Request, res: Response) {
    try {
      const actorId = userIdOf(req);
      const { module: mod } = await accessService.requireModule(String(req.params.moduleId), actorId, 'manageModules');

      const requested: string[] = Array.isArray(req.body?.userIds)
        ? [...new Set<string>(req.body.userIds.filter((id: unknown) => typeof id === 'string'))]
        : [];
      if (requested.length === 0) throw new AccessError(400, 'Pick at least one person', 'VALIDATION_FAILED');

      const projectRows = await db.query.projectMembers.findMany({
        where: and(eq(projectMembers.projectId, mod.projectId), inArray(projectMembers.userId, requested)),
      });
      if (projectRows.length !== requested.length) {
        throw new AccessError(400, 'Everyone added to a module must be on the project first', 'VALIDATION_FAILED');
      }

      const existing = await db.query.moduleMembers.findMany({
        where: and(eq(moduleMembers.moduleId, mod.id), inArray(moduleMembers.userId, requested)),
        columns: { userId: true },
      });
      const already = new Set(existing.map((m) => m.userId));
      const toAdd = projectRows.filter((pm) => !already.has(pm.userId));

      if (toAdd.length > 0) {
        await db.insert(moduleMembers).values(
          toAdd.map((pm) => ({ moduleId: mod.id, userId: pm.userId, projectMemberId: pm.id }))
        );
        await chatSyncService.add(mod.id, toAdd.map((pm) => pm.userId));
        await publisherService.project({
          type: 'module.member_added',
          data: {
            projectId: mod.projectId,
            moduleId: mod.id,
            moduleName: mod.name,
            userIds: toAdd.map((pm) => pm.userId).filter((id) => id !== actorId),
            actorId,
            actorName: (req as any).user.name ?? 'Someone',
          },
        });
      }

      res.status(201).json({ added: toAdd.length });
    } catch (error) {
      sendError(res, error, 'Failed to add module members');
    }
  }

  /** POST /modules/:moduleId/join — any project member can join a module. */
  async join(req: Request, res: Response) {
    try {
      const userId = userIdOf(req);
      const { module: mod, member } = await accessService.requireModule(String(req.params.moduleId), userId);

      if (!(await accessService.isModuleMember(mod.id, userId))) {
        await db.insert(moduleMembers).values({ moduleId: mod.id, userId, projectMemberId: member.id });
      }
      await chatSyncService.add(mod.id, [userId]);

      res.json({ success: true });
    } catch (error) {
      sendError(res, error, 'Failed to join module');
    }
  }

  /**
   * DELETE /modules/:moduleId/members/:userId
   * Admins remove anyone; members can remove themselves.
   */
  async removeMember(req: Request, res: Response) {
    try {
      const actorId = userIdOf(req);
      const targetId = String(req.params.userId);
      const { module: mod } = await accessService.requireModule(
        String(req.params.moduleId),
        actorId,
        targetId === actorId ? undefined : 'manageModules'
      );

      const removed = await db
        .delete(moduleMembers)
        .where(and(eq(moduleMembers.moduleId, mod.id), eq(moduleMembers.userId, targetId)))
        .returning({ id: moduleMembers.id });
      if (removed.length === 0) throw new AccessError(404, 'That person is not on this module', 'NOT_FOUND');

      await chatSyncService.remove(mod.id, [targetId]);
      res.json({ success: true });
    } catch (error) {
      sendError(res, error, 'Failed to remove module member');
    }
  }
}

export const moduleController = new ModuleController();
