import type { NextFunction, Response } from 'express';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { columns } from '../models/column.model.js';
import { tasks } from '../models/task.model.js';
import { resolveUser, type AuthedRequest } from './auth.js';

/** What project-service says about the caller and one module board. */
export interface BoardAccess {
  boardId: string;
  role: 'admin' | 'member' | 'viewer';
  moduleName: string;
  projectId: string;
  projectName: string;
}

export interface BoardRequest extends AuthedRequest {
  board?: BoardAccess;
}

const cache = new Map<string, { access: BoardAccess | null; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

/**
 * Boards are per module and modules belong to project-service, so access is
 * whatever project-service answers for GET /project/modules/:id with the
 * caller's own credentials. Briefly cached: drag-and-drop fires bursts.
 */
export async function lookupBoardAccess(req: AuthedRequest, boardId: string): Promise<BoardAccess | null> {
  const authorization = req.headers.authorization;
  if (!authorization) return null;

  const key = `${authorization}:${boardId}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.access;

  let access: BoardAccess | null = null;
  try {
    const res = await fetch(`${env.PROJECT_SERVICE_URL}/project/modules/${encodeURIComponent(boardId)}`, {
      headers: { authorization },
    });
    if (res.ok) {
      const mod = (await res.json()) as any;
      access = {
        boardId,
        role: mod.userRole,
        moduleName: mod.name,
        projectId: mod.projectId,
        projectName: mod.project?.name ?? 'Project',
      };
    } else if (res.status >= 500) {
      // Do not cache an outage as a denial.
      return null;
    }
  } catch (error: any) {
    console.error('[board-service:access] project-service lookup failed:', error.message);
    return null;
  }

  if (cache.size > 5_000) cache.clear();
  cache.set(key, { access, expiresAt: Date.now() + CACHE_TTL_MS });
  return access;
}

type BoardIdResolver = (req: BoardRequest) => Promise<string | null> | string | null;

/** Board id straight from a route parameter (`/tasks/:projectId`). */
export const fromParam = (name: string): BoardIdResolver => (req) => String(req.params[name] ?? '') || null;

/** Board id from a body field (`POST /tasks { columnId }`). */
export const fromColumn = (pick: (req: BoardRequest) => unknown): BoardIdResolver => async (req) => {
  const columnId = pick(req);
  if (typeof columnId !== 'string' || !columnId) return null;
  const [column] = await db.select({ projectId: columns.projectId }).from(columns).where(eq(columns.id, columnId));
  return column?.projectId ?? null;
};

/** Board id for an existing task (`PATCH /tasks/:id`). */
export const fromTask = (param = 'id'): BoardIdResolver => async (req) => {
  const [row] = await db
    .select({ projectId: columns.projectId })
    .from(tasks)
    .innerJoin(columns, eq(tasks.columnId, columns.id))
    .where(eq(tasks.id, String(req.params[param])));
  return row?.projectId ?? null;
};

/**
 * Signed in, and allowed on the board the request touches. Unknown boards and
 * boards the caller cannot see both answer 404; viewers may only read.
 */
export function requireBoard(resolveBoardId: BoardIdResolver, mode: 'read' | 'write') {
  return async (req: BoardRequest, res: Response, next: NextFunction) => {
    const userId = await resolveUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });

    let boardId: string | null;
    try {
      boardId = await resolveBoardId(req);
    } catch {
      boardId = null;
    }
    if (!boardId) return res.status(404).json({ error: 'Board not found', code: 'NOT_FOUND' });

    const access = await lookupBoardAccess(req, boardId);
    if (!access) return res.status(404).json({ error: 'Board not found', code: 'NOT_FOUND' });
    if (mode === 'write' && access.role === 'viewer') {
      return res.status(403).json({ error: 'Viewers cannot change the board', code: 'FORBIDDEN' });
    }

    req.board = access;
    next();
  };
}
