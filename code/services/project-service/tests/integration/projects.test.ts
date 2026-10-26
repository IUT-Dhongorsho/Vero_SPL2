import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

// Side effects that would reach other services are captured instead.
vi.mock('../../src/grpc/client.js', () => ({
  createChatChannel: vi.fn(async () => ({ success: true, id: 'chan-test' })),
  addChatMembers: vi.fn(async () => ({ success: true })),
  removeChatMembers: vi.fn(async () => ({ success: true })),
}));
vi.mock('../../src/services/queue.service.js', () => ({
  queueService: { queueModuleProvisioning: vi.fn(async () => undefined) },
}));
vi.mock('../../src/services/publisher.service.js', () => ({
  publisherService: { project: vi.fn(async () => undefined), resource: vi.fn(async () => undefined) },
}));

import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { modules } from '../../src/models/workspace.model.js';
import { eq } from 'drizzle-orm';
import { addChatMembers, removeChatMembers } from '../../src/grpc/client.js';
import { publisherService } from '../../src/services/publisher.service.js';
import { seedUsers, cleanup, type TestUser } from '../helpers.js';

let owner: TestUser, mate: TestUser, outsider: TestUser;
let projectId: string;
let inviteCode: string;
const projectIds: string[] = [];

beforeAll(async () => {
  [owner, mate, outsider] = await seedUsers(['Owner', 'Mate', 'Outsider']);
});

afterAll(async () => {
  await cleanup([owner, mate, outsider].map((u) => u.id), projectIds);
});

describe('projects', () => {
  it('rejects requests without a session', async () => {
    const res = await request(app).get('/project/projects');
    expect(res.status).toBe(401);
  });

  it('requires a name', async () => {
    const res = await request(app).post('/project/projects').set(owner.auth).send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('creates a project with the creator as admin', async () => {
    const res = await request(app)
      .post('/project/projects')
      .set(owner.auth)
      .send({ name: '  Apollo  ', description: 'Moon shot' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Apollo');
    expect(res.body.userRole).toBe('admin');
    expect(res.body.inviteCode).toMatch(/^[A-Z2-9]{6}$/);
    projectId = res.body.id;
    inviteCode = res.body.inviteCode;
    projectIds.push(projectId);
  });

  it('hides the project from non-members with a 404', async () => {
    const res = await request(app).get(`/project/projects/${projectId}`).set(outsider.auth);
    expect(res.status).toBe(404);
  });

  it('lets someone join with the invite code (case-insensitive) and announces it', async () => {
    const res = await request(app)
      .post('/project/projects/join')
      .set(mate.auth)
      .send({ inviteCode: inviteCode.toLowerCase() });

    expect(res.status).toBe(200);
    expect(res.body.projectId).toBe(projectId);
    expect(publisherService.project).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'project.member_joined', data: expect.objectContaining({ userId: mate.id }) })
    );
  });

  it('refuses a second join', async () => {
    const res = await request(app).post('/project/projects/join').set(mate.auth).send({ inviteCode });
    expect(res.status).toBe(409);
  });

  it('shows the invite code to admins only', async () => {
    const asAdmin = await request(app).get(`/project/projects/${projectId}`).set(owner.auth);
    const asMember = await request(app).get(`/project/projects/${projectId}`).set(mate.auth);
    expect(asAdmin.body.inviteCode).toBe(inviteCode);
    expect(asMember.body.inviteCode).toBeUndefined();
    expect(asMember.body.userRole).toBe('member');
    expect(asMember.body.memberCount).toBe(2);
  });

  it('only lets admins rename the project', async () => {
    const denied = await request(app).patch(`/project/projects/${projectId}`).set(mate.auth).send({ name: 'Hijack' });
    expect(denied.status).toBe(403);

    const ok = await request(app).patch(`/project/projects/${projectId}`).set(owner.auth).send({ status: 'completed' });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('completed');

    const bad = await request(app).patch(`/project/projects/${projectId}`).set(owner.auth).send({ status: 'paused' });
    expect(bad.status).toBe(400);
  });
});

describe('members', () => {
  it('lists members admins-first with their profile', async () => {
    const res = await request(app).get(`/project/projects/${projectId}/members`).set(mate.auth);
    expect(res.status).toBe(200);
    expect(res.body.map((m: any) => [m.userId, m.role])).toEqual([
      [owner.id, 'admin'],
      [mate.id, 'member'],
    ]);
    expect(res.body[0].user.name).toBe('Owner');
  });

  it('stops members from changing roles', async () => {
    const res = await request(app)
      .patch(`/project/projects/${projectId}/members/${owner.id}`)
      .set(mate.auth)
      .send({ role: 'viewer' });
    expect(res.status).toBe(403);
  });

  it('validates the role', async () => {
    const res = await request(app)
      .patch(`/project/projects/${projectId}/members/${mate.id}`)
      .set(owner.auth)
      .send({ role: 'owner' });
    expect(res.status).toBe(400);
  });

  it('never leaves a project without an admin', async () => {
    const demote = await request(app)
      .patch(`/project/projects/${projectId}/members/${owner.id}`)
      .set(owner.auth)
      .send({ role: 'member' });
    expect(demote.status).toBe(409);
    expect(demote.body.code).toBe('LAST_ADMIN');

    const leave = await request(app).delete(`/project/projects/${projectId}/members/${owner.id}`).set(owner.auth);
    expect(leave.status).toBe(409);
  });

  it('lets an admin change a role', async () => {
    const res = await request(app)
      .patch(`/project/projects/${projectId}/members/${mate.id}`)
      .set(owner.auth)
      .send({ role: 'viewer' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('viewer');
  });
});

describe('modules', () => {
  let moduleId: string;

  it('only lets admins create modules', async () => {
    const denied = await request(app)
      .post('/project/modules')
      .set(mate.auth)
      .send({ projectId, name: 'Sneaky' });
    expect(denied.status).toBe(403);

    const res = await request(app)
      .post('/project/modules')
      .set(owner.auth)
      .send({ projectId, name: 'Launch', description: 'Ship it' });
    expect(res.status).toBe(201);
    expect(res.body.isMember).toBe(true);
    moduleId = res.body.id;
  });

  it('lists modules with membership for the caller', async () => {
    const asOwner = await request(app).get(`/project/projects/${projectId}/modules`).set(owner.auth);
    const asMate = await request(app).get(`/project/projects/${projectId}/modules`).set(mate.auth);
    expect(asOwner.body[0]).toMatchObject({ id: moduleId, isMember: true, members: 1 });
    expect(asOwner.body[0].memberPreview[0].user.name).toBe('Owner');
    expect(asMate.body[0].isMember).toBe(false);

    const outsiderRes = await request(app).get(`/project/projects/${projectId}/modules`).set(outsider.auth);
    expect(outsiderRes.status).toBe(404);
  });

  it('refuses to add someone who is not on the project', async () => {
    const res = await request(app)
      .post(`/project/modules/${moduleId}/members`)
      .set(owner.auth)
      .send({ userIds: [outsider.id] });
    expect(res.status).toBe(400);
  });

  it('adds a project member and mirrors it into the module chat', async () => {
    await db.update(modules).set({ chatResourceId: 'chan-test' }).where(eq(modules.id, moduleId));

    const res = await request(app)
      .post(`/project/modules/${moduleId}/members`)
      .set(owner.auth)
      .send({ userIds: [mate.id, mate.id] });
    expect(res.status).toBe(201);
    expect(res.body.added).toBe(1);
    expect(addChatMembers).toHaveBeenCalledWith({ channelId: 'chan-test', userIds: [mate.id] });

    const again = await request(app)
      .post(`/project/modules/${moduleId}/members`)
      .set(owner.auth)
      .send({ userIds: [mate.id] });
    expect(again.body.added).toBe(0);
  });

  it('returns the module with its members', async () => {
    const res = await request(app).get(`/project/modules/${moduleId}`).set(mate.auth);
    expect(res.status).toBe(200);
    expect(res.body.isMember).toBe(true);
    expect(res.body.project.name).toBe('Apollo');
    expect(res.body.members.map((m: any) => m.userId).sort()).toEqual([owner.id, mate.id].sort());
  });

  it('lets a member leave a module and revokes their chat', async () => {
    const res = await request(app).delete(`/project/modules/${moduleId}/members/${mate.id}`).set(mate.auth);
    expect(res.status).toBe(200);
    expect(removeChatMembers).toHaveBeenCalledWith({ channelId: 'chan-test', userIds: [mate.id] });
  });

  it('lets any project member join a module', async () => {
    const res = await request(app).post(`/project/modules/${moduleId}/join`).set(mate.auth);
    expect(res.status).toBe(200);
    const mod = await request(app).get(`/project/modules/${moduleId}`).set(mate.auth);
    expect(mod.body.isMember).toBe(true);
  });

  it('validates module status and restricts updates to admins', async () => {
    const denied = await request(app).patch(`/project/modules/${moduleId}`).set(mate.auth).send({ status: 'at-risk' });
    expect(denied.status).toBe(403);
    const bad = await request(app).patch(`/project/modules/${moduleId}`).set(owner.auth).send({ status: 'sideways' });
    expect(bad.status).toBe(400);
    const ok = await request(app).patch(`/project/modules/${moduleId}`).set(owner.auth).send({ status: 'at-risk' });
    expect(ok.body.status).toBe('at-risk');
  });

  it('removes a project member from their module chats when they are removed', async () => {
    vi.mocked(removeChatMembers).mockClear();
    const res = await request(app).delete(`/project/projects/${projectId}/members/${mate.id}`).set(owner.auth);
    expect(res.status).toBe(200);
    expect(removeChatMembers).toHaveBeenCalledWith({ channelId: 'chan-test', userIds: [mate.id] });

    const members = await request(app).get(`/project/projects/${projectId}/members`).set(owner.auth);
    expect(members.body).toHaveLength(1);
  });
});

describe('modules/mine', () => {
  it('lists every module the caller can reach, with their role', async () => {
    const res = await request(app).get('/project/modules/mine').set(owner.auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({ name: 'Launch', projectId, projectName: 'Apollo', role: 'admin' }),
    ]);

    const none = await request(app).get('/project/modules/mine').set(outsider.auth);
    expect(none.body).toEqual([]);
  });
});
