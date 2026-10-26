import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { eq, inArray } from 'drizzle-orm';

vi.mock('../src/services/publisher.service.js', () => ({
  publisherService: { taskAssigned: vi.fn(async () => undefined) },
}));

import { app } from '../src/app.js';
import { db } from '../src/db/client.js';
import { projects } from '../src/models/project.model.js';
import { columns } from '../src/models/column.model.js';
import { tasks } from '../src/models/task.model.js';
import { publisherService } from '../src/services/publisher.service.js';

// Two module boards; who may see them is decided by the fake project-service below.
const BOARD = 'mod-access-board';
const OTHER_BOARD = 'mod-access-other';

const people: Record<string, { userId: string; roles: Record<string, string> }> = {
  'token-admin': { userId: 'u-admin', roles: { [BOARD]: 'admin', [OTHER_BOARD]: 'admin' } },
  'token-member': { userId: 'u-member', roles: { [BOARD]: 'member' } },
  'token-viewer': { userId: 'u-viewer', roles: { [BOARD]: 'viewer' } },
  'token-stranger': { userId: 'u-stranger', roles: {} },
};
const as = (token: string) => ({ Authorization: `Bearer ${token}` });

const realFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = vi.fn(async (input: any, init?: any) => {
    const url = String(input);
    const token = String(init?.headers?.authorization ?? '').replace('Bearer ', '');
    const person = people[token];

    if (url.includes('/internal/verify')) {
      return person ? Response.json({ user: { id: person.userId } }) : new Response('{}', { status: 401 });
    }
    const match = url.match(/\/project\/modules\/([^/?]+)/);
    if (match) {
      const role = person?.roles[decodeURIComponent(match[1])];
      return role
        ? Response.json({ name: 'Launch', projectId: 'proj-1', project: { name: 'Apollo' }, userRole: role })
        : new Response('{}', { status: 404 });
    }
    return realFetch(input, init);
  }) as any;
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  const cols = await db.select({ id: columns.id }).from(columns).where(inArray(columns.projectId, [BOARD, OTHER_BOARD]));
  if (cols.length) await db.delete(tasks).where(inArray(tasks.columnId, cols.map((c) => c.id)));
  await db.delete(columns).where(inArray(columns.projectId, [BOARD, OTHER_BOARD]));
  await db.delete(projects).where(inArray(projects.id, [BOARD, OTHER_BOARD]));
});

let backlog: string;
let taskId: string;

describe('board access', () => {
  it('rejects requests without a session', async () => {
    const res = await request(app).get(`/api/board/tasks/${BOARD}`);
    expect(res.status).toBe(401);
  });

  it('initialises a module board and records its project', async () => {
    const res = await request(app).post(`/api/board/init/${BOARD}`).set(as('token-member'));
    expect(res.status).toBe(200);
    expect(res.body.columns.map((c: any) => c.name)).toEqual(['Backlog', 'In Progress', 'In Review', 'Done']);
    backlog = res.body.columns[0].id;

    const [replica] = await db.select().from(projects).where(eq(projects.id, BOARD));
    expect(replica).toMatchObject({ name: 'Launch', parentProjectId: 'proj-1', parentProjectName: 'Apollo' });
  });

  it('hides boards from people outside the module’s project', async () => {
    const res = await request(app).get(`/api/board/tasks/${BOARD}`).set(as('token-stranger'));
    expect(res.status).toBe(404);
  });

  it('takes the creator from the session, not the request body', async () => {
    const res = await request(app)
      .post('/api/board/tasks')
      .set(as('token-member'))
      .send({ title: 'Write launch notes', columnId: backlog, creatorId: 'someone-else' });
    expect(res.status).toBe(201);
    expect(res.body.creatorId).toBe('u-member');
    taskId = res.body.id;
  });

  it('keeps viewers read-only', async () => {
    const read = await request(app).get(`/api/board/tasks/${BOARD}`).set(as('token-viewer'));
    expect(read.status).toBe(200);
    expect(read.body).toHaveLength(1);

    const write = await request(app).patch(`/api/board/tasks/${taskId}`).set(as('token-viewer')).send({ title: 'Mine now' });
    expect(write.status).toBe(403);
  });

  it('announces an assignment to someone else, but not to yourself', async () => {
    vi.mocked(publisherService.taskAssigned).mockClear();

    await request(app).patch(`/api/board/tasks/${taskId}`).set(as('token-member')).send({ assigneeId: 'u-member' });
    expect(publisherService.taskAssigned).not.toHaveBeenCalled();

    const res = await request(app).patch(`/api/board/tasks/${taskId}`).set(as('token-member')).send({ assigneeId: 'u-viewer' });
    expect(res.status).toBe(200);
    expect(publisherService.taskAssigned).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId,
        assigneeId: 'u-viewer',
        assignerId: 'u-member',
        moduleId: BOARD,
        projectId: 'proj-1',
        projectName: 'Apollo',
      })
    );
  });

  it('refuses to move a task onto another board', async () => {
    const other = await request(app).post(`/api/board/init/${OTHER_BOARD}`).set(as('token-admin'));
    const foreignColumn = other.body.columns[0].id;

    const res = await request(app)
      .patch(`/api/board/tasks/${taskId}/move`)
      .set(as('token-admin'))
      .send({ columnId: foreignColumn, order: 0 });
    expect(res.status).toBe(400);
  });

  it('validates priority', async () => {
    const res = await request(app).patch(`/api/board/tasks/${taskId}`).set(as('token-member')).send({ priority: 'meh' });
    expect(res.status).toBe(400);
  });

  it('lists assigned tasks with their module and project', async () => {
    const res = await request(app).get('/api/board/my/work').set(as('token-viewer'));
    expect(res.status).toBe(200);
    expect(res.body.projectTasks[0]).toMatchObject({
      id: taskId,
      moduleId: BOARD,
      moduleName: 'Launch',
      projectId: 'proj-1',
      projectName: 'Apollo',
    });
  });
});

describe('board initialisation', () => {
  it('creates one set of columns however many requests race to open the board', async () => {
    const RACE = 'mod-access-race';
    people['token-member'].roles[RACE] = 'member';
    try {
      await Promise.all(Array.from({ length: 5 }, () => request(app).post(`/api/board/init/${RACE}`).set(as('token-member'))));
      const cols = await db.select().from(columns).where(eq(columns.projectId, RACE));
      expect(cols.map((c) => c.name).sort()).toEqual(['Backlog', 'Done', 'In Progress', 'In Review']);
    } finally {
      await db.delete(columns).where(eq(columns.projectId, RACE));
      await db.delete(projects).where(eq(projects.id, RACE));
    }
  });
});
