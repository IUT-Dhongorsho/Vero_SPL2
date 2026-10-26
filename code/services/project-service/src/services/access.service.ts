import { and, eq } from 'drizzle-orm';
import { PROJECT_PERMISSIONS, type ProjectRole } from '@repo/shared';
import { db } from '../db/client.js';
import { moduleMembers, modules, projectMembers } from '../models/workspace.model.js';

export type Permission = keyof (typeof PROJECT_PERMISSIONS)['admin'];

/** An HTTP-shaped failure the controllers turn into a response. */
export class AccessError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export const accessService = {
  async membership(projectId: string, userId: string) {
    return db.query.projectMembers.findFirst({
      where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)),
    });
  },

  /**
   * Resolves the caller's membership and checks one permission. Non-members
   * get a 404 rather than a 403 so project ids cannot be probed.
   */
  async require(projectId: string, userId: string, permission?: Permission) {
    const member = await this.membership(projectId, userId);
    if (!member) throw new AccessError(404, 'Project not found', 'NOT_FOUND');

    const role = member.role as ProjectRole;
    if (permission && !PROJECT_PERMISSIONS[role]?.[permission]) {
      throw new AccessError(403, 'You do not have permission to do that', 'FORBIDDEN');
    }
    return member;
  },

  /** Loads a module and authorises the caller against its project. */
  async requireModule(moduleId: string, userId: string, permission?: Permission) {
    const mod = await db.query.modules.findFirst({ where: eq(modules.id, moduleId) });
    if (!mod) throw new AccessError(404, 'Module not found', 'NOT_FOUND');
    const member = await this.require(mod.projectId, userId, permission);
    return { module: mod, member };
  },

  async isModuleMember(moduleId: string, userId: string) {
    const row = await db.query.moduleMembers.findFirst({
      where: and(eq(moduleMembers.moduleId, moduleId), eq(moduleMembers.userId, userId)),
    });
    return !!row;
  },

  async adminCount(projectId: string) {
    const admins = await db.query.projectMembers.findMany({
      where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.role, 'admin')),
      columns: { id: true },
    });
    return admins.length;
  },
};

/** Shared catch-all so every controller answers failures the same way. */
export function sendError(res: any, error: unknown, fallback: string) {
  if (error instanceof AccessError) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }
  console.error(`❌ [project-service] ${fallback}:`, error);
  return res.status(500).json({ error: fallback, code: 'INTERNAL' });
}
