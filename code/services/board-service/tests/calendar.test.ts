import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { inArray } from 'drizzle-orm';

vi.mock('../src/services/publisher.service.js', () => ({
  publisherService: { taskAssigned: vi.fn(async () => undefined), workChanged: vi.fn(async () => undefined) },
}));

import { app } from '../src/app.js';
import { db } from '../src/db/client.js';
import { projects } from '../src/models/project.model.js';
import { columns } from '../src/models/column.model.js';
import { tasks } from '../src/models/task.model.js';
import { personalTasks } from '../src/models/personalTask.model.js';
import { publisherService } from '../src/services/publisher.service.js';

// The lead runs TEAM's project and is a plain member of OTHER's.
const TEAM = 'mod-cal-team';
const OTHER = 'mod-cal-other';

const people: Record<string, { userId: string; roles: Record<string, string> }> = {
  'token-lead': { userId: 'u-cal-lead', roles: { [TEAM]: 'admin', [OTHER]: 'member' } },
  'token-member': { userId: 'u-cal-member', roles: { [TEAM]: 'member', [OTHER]: 'member' } },
};
const as = (token: string) => ({ Authorization: `Bearer ${token}` });
const projectOf: Record<string, string> = { [TEAM]: 'proj-cal-team', [OTHER]: 'proj-cal-other' };

const realFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = vi.fn(async (input: any, init?: any) => {
    const url = String(input);
    const token = String(init?.headers?.authorization ?? '').replace('Bearer ', '');
    const person = people[token];

    if (url.includes('/internal/verify')) {
      return person ? Response.json({ user: { id: person.userId } }) : new Response('{}', { status: 401 });
    }
    if (url.endsWith('/project/modules/mine')) {
      return Response.json(
        Object.entries(person?.roles ?? {}).map(([id, role]) => ({ id, name: id, projectId: projectOf[id], role }))
      );
    }
    if (/\/project\/projects\/[^/]+\/members$/.test(url)) {
      return Response.json(Object.values(people).map((p) => ({ userId: p.userId })));
    }
    const match = url.match(/\/project\/modules\/([^/?]+)/);
    if (match) {
      const id = decodeURIComponent(match[1]);
      const role = person?.roles[id];
      return role
        ? Response.json({ name: id, projectId: projectOf[id], project: { name: id }, userRole: role })
        : new Response('{}', { status: 404 });
    }
    return realFetch(input, init);
  }) as any;
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  const cols = await db.select({ id: columns.id }).from(columns).where(inArray(columns.projectId, [TEAM, OTHER]));
  if (cols.length) await db.delete(tasks).where(inArray(tasks.columnId, cols.map((c) => c.id)));
  await db.delete(columns).where(inArray(columns.projectId, [TEAM, OTHER]));
  await db.delete(projects).where(inArray(projects.id, [TEAM, OTHER]));
  await db.delete(personalTasks).where(inArray(personalTasks.userId, ['u-cal-lead', 'u-cal-member']));
});

const due = new Date(Date.now() + 3 * 86_400_000).toISOString();
const titles = (list: any[]) => list.map((t) => t.title).sort();

describe('calendar scope', () => {
  let teamColumn: string;

  it('sets up two boards with deadlines for different people', async () => {
    teamColumn = (await request(app).post(`/api/board/init/${TEAM}`).set(as('token-lead'))).body.columns[0].id;
    const otherColumn = (await request(app).post(`/api/board/init/${OTHER}`).set(as('token-lead'))).body.columns[0].id;

    const create = (columnId: string, title: string, assigneeId?: string) =>
      request(app).post('/api/board/tasks').set(as('token-lead')).send({ title, columnId, assigneeId, dueDate: due });

    expect((await create(teamColumn, 'Member deadline', 'u-cal-member')).status).toBe(201);
    expect((await create(teamColumn, 'Lead deadline', 'u-cal-lead')).status).toBe(201);
    expect((await create(teamColumn, 'Nobody owns this')).status).toBe(201);
    expect((await create(otherColumn, 'Other project task', 'u-cal-member')).status).toBe(201);

    const personal = await request(app)
      .post('/api/board/personal-tasks')
      .set(as('token-member'))
      .send({ title: 'Member private errand', dueDate: due });
    expect(personal.status).toBe(201);
  });

  it('shows a member only their own deadlines', async () => {
    const res = await request(app).get('/api/board/my/calendar').set(as('token-member'));
    expect(res.status).toBe(200);
    expect(res.body.canSeeTeam).toBe(false);
    expect(titles(res.body.projectTasks)).toEqual(['Member deadline', 'Other project task']);
    expect(titles(res.body.personalTasks)).toEqual(['Member private errand']);
  });

  it('refuses the team calendar to anyone who is not a project admin', async () => {
    const res = await request(app).get('/api/board/my/calendar?scope=team').set(as('token-member'));
    expect(res.status).toBe(403);
  });

  it('shows an admin every deadline in the projects they run, unassigned ones included', async () => {
    const res = await request(app).get('/api/board/my/calendar?scope=team').set(as('token-lead'));
    expect(res.status).toBe(200);
    expect(res.body.canSeeTeam).toBe(true);
    // Not the project they are only a member of.
    expect(titles(res.body.projectTasks)).toEqual(['Lead deadline', 'Member deadline', 'Nobody owns this']);
    const member = res.body.projectTasks.find((t: any) => t.title === 'Member deadline');
    expect(member.assignee).toMatchObject({ id: 'u-cal-member' });
    expect(res.body.projectTasks.find((t: any) => t.title === 'Nobody owns this').assignee).toBeNull();
  });

  it('never shows an admin other people’s personal tasks', async () => {
    const res = await request(app).get('/api/board/my/calendar?scope=team').set(as('token-lead'));
    expect(res.body.personalTasks).toEqual([]);
  });

  it('tells everyone on the project when a task changes', async () => {
    vi.mocked(publisherService.workChanged).mockClear();
    const task = (await request(app).get(`/api/board/tasks/${TEAM}`).set(as('token-lead'))).body[0];
    const res = await request(app).patch(`/api/board/tasks/${task.id}`).set(as('token-lead')).send({ dueDate: due });
    expect(res.status).toBe(200);

    await vi.waitFor(() => expect(publisherService.workChanged).toHaveBeenCalled());
    expect(publisherService.workChanged).toHaveBeenCalledWith({
      recipientIds: ['u-cal-lead', 'u-cal-member'],
      boardId: TEAM,
      projectId: 'proj-cal-team',
    });
  });
});
