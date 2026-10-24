import { Request, Response } from 'express';
import { and, eq, inArray } from 'drizzle-orm';
import { isProjectRole } from '@repo/shared';
import { db } from '../db/client.js';
import { moduleMembers, modules, projectMembers, projects } from '../models/workspace.model.js';
import { accessService, AccessError, sendError } from '../services/access.service.js';
import { chatSyncService } from '../services/chat-sync.service.js';
import { publisherService } from '../services/publisher.service.js';

const userIdOf = (req: Request) => (req as any).user.id as string;

export class MemberController {
  /**
   * GET /projects/:projectId/members
   * Everyone on the project, admins first, with the replicated profile.
   */
  async list(req: Request, res: Response) {
    try {
      const projectId = String(req.params.projectId);
      await accessService.require(projectId, userIdOf(req));

      const rows = await db.query.projectMembers.findMany({
        where: eq(projectMembers.projectId, projectId),
        with: { user: true },
      });

      const rank = { admin: 0, member: 1, viewer: 2 } as Record<string, number>;
      rows.sort((a, b) => (rank[a.role] ?? 9) - (rank[b.role] ?? 9) || a.joinedAt.getTime() - b.joinedAt.getTime());

      res.json(
        rows.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          user: { id: m.user.id, name: m.user.name, avatarUrl: m.user.avatarUrl ?? null },
        }))
      );
    } catch (error) {
      sendError(res, error, 'Failed to fetch members');
    }
  }

  /**
   * PATCH /projects/:projectId/members/:userId  { role }
   * Admin only. The last admin cannot be demoted — a project with no admin
   * could never be managed again.
   */
  async updateRole(req: Request, res: Response) {
    try {
      const projectId = String(req.params.projectId);
      const targetId = String(req.params.userId);
      const actorId = userIdOf(req);
      const { role } = req.body ?? {};

      if (!isProjectRole(role)) {
        throw new AccessError(400, 'Role must be admin, member or viewer', 'VALIDATION_FAILED');
      }

      await accessService.require(projectId, actorId, 'manageMembers');
      const target = await accessService.membership(projectId, targetId);
      if (!target) throw new AccessError(404, 'That person is not on this project', 'NOT_FOUND');

      if (target.role === 'admin' && role !== 'admin' && (await accessService.adminCount(projectId)) <= 1) {
        throw new AccessError(409, 'A project needs at least one admin', 'LAST_ADMIN');
      }

      const [updated] = await db
        .update(projectMembers)
        .set({ role })
        .where(eq(projectMembers.id, target.id))
        .returning();

      const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
      await publisherService.project({
        type: 'project.role_changed',
        data: { projectId, projectName: project?.name ?? 'a project', userId: targetId, role, actorId },
      });

      res.json(updated);
    } catch (error) {
      sendError(res, error, 'Failed to update role');
    }
  }

  /**
   * DELETE /projects/:projectId/members/:userId
   * Admins remove anyone; anyone may remove themselves (leave). Their module
   * memberships cascade away, so their module chats are revoked first.
   */
  async remove(req: Request, res: Response) {
    try {
      const projectId = String(req.params.projectId);
      const targetId = String(req.params.userId);
      const actorId = userIdOf(req);
      const leaving = targetId === actorId;

      await accessService.require(projectId, actorId, leaving ? undefined : 'manageMembers');
      const target = await accessService.membership(projectId, targetId);
      if (!target) throw new AccessError(404, 'That person is not on this project', 'NOT_FOUND');

      if (target.role === 'admin' && (await accessService.adminCount(projectId)) <= 1) {
        throw new AccessError(
          409,
          leaving
            ? 'You are the only admin — make someone else an admin before leaving'
            : 'A project needs at least one admin',
          'LAST_ADMIN'
        );
      }

      const projectModules = await db.query.modules.findMany({
        where: eq(modules.projectId, projectId),
        columns: { id: true },
      });
      const moduleIds = projectModules.map((m) => m.id);
      const memberOf = moduleIds.length
        ? await db.query.moduleMembers.findMany({
            where: and(inArray(moduleMembers.moduleId, moduleIds), eq(moduleMembers.userId, targetId)),
            columns: { moduleId: true },
          })
        : [];

      await db.delete(projectMembers).where(eq(projectMembers.id, target.id));
      await Promise.all(memberOf.map((m) => chatSyncService.remove(m.moduleId, [targetId])));

      const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
      await publisherService.project({
        type: 'project.member_removed',
        data: { projectId, projectName: project?.name ?? 'a project', userId: targetId, actorId },
      });

      res.json({ success: true });
    } catch (error) {
      sendError(res, error, 'Failed to remove member');
    }
  }
}

export const memberController = new MemberController();
