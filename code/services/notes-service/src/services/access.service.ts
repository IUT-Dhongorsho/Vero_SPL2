import { env } from '../config/env.js';

export type ModuleRole = 'admin' | 'member' | 'viewer';

export interface ModuleRef {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  role: ModuleRole;
}

/** A failure the controllers turn into an HTTP status. */
export class NotesError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

const roleCache = new Map<string, { role: ModuleRole | null; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

/**
 * Notes belong to modules, and modules to project-service. The caller's role
 * there is asked for with the caller's own credentials, briefly cached.
 */
export const accessService = {
  async moduleRole(authorization: string, moduleId: string): Promise<ModuleRole | null> {
    const key = `${authorization}:${moduleId}`;
    const cached = roleCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.role;

    let role: ModuleRole | null = null;
    try {
      const res = await fetch(`${env.PROJECT_SERVICE_URL}/project/modules/${encodeURIComponent(moduleId)}`, {
        headers: { authorization },
      });
      if (res.ok) role = ((await res.json()) as any).userRole ?? null;
      else if (res.status >= 500) throw new NotesError(503, 'Could not check access right now');
    } catch (error) {
      if (error instanceof NotesError) throw error;
      throw new NotesError(503, 'Could not check access right now');
    }

    if (roleCache.size > 5_000) roleCache.clear();
    roleCache.set(key, { role, expiresAt: Date.now() + CACHE_TTL_MS });
    return role;
  },

  async requireModule(authorization: string, moduleId: string, write = false): Promise<ModuleRole> {
    const role = await this.moduleRole(authorization, moduleId);
    if (!role) throw new NotesError(404, 'Module not found', 'NOT_FOUND');
    if (write && role === 'viewer') throw new NotesError(403, 'Viewers cannot change notes', 'FORBIDDEN');
    return role;
  },

  /** Every module the caller can reach — scopes search. */
  async myModules(authorization: string): Promise<ModuleRef[]> {
    const res = await fetch(`${env.PROJECT_SERVICE_URL}/project/modules/mine`, { headers: { authorization } });
    if (!res.ok) throw new NotesError(503, 'Could not load your modules');
    return (await res.json()) as ModuleRef[];
  },
};
