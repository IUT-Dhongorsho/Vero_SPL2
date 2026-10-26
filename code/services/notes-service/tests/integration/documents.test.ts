import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { inArray } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { users, sessions } from '../../src/models/user.model.js';
import { documents } from '../../src/models/document.model.js';

// Module roles, as the fake project-service below reports them.
const MOD = `mod-notes-${Date.now()}`;
const OTHER = `${MOD}-other`;
const roles: Record<string, Record<string, string>> = {
  author: { [MOD]: 'member', [OTHER]: 'member' },
  teammate: { [MOD]: 'member' },
  viewer: { [MOD]: 'viewer' },
  admin: { [MOD]: 'admin' },
  outsider: {},
};
const people = Object.keys(roles).map((name) => ({ name, id: `notes-${name}-${Date.now()}`, token: crypto.randomBytes(16).toString('hex') }));
const by = (name: string) => people.find((p) => p.name === name)!;
const as = (name: string) => ({ Authorization: `Bearer ${by(name).token}` });

const realFetch = globalThis.fetch;
beforeAll(async () => {
  globalThis.fetch = vi.fn(async (input: any, init?: any) => {
    const url = String(input);
    const token = String(init?.headers?.authorization ?? '').replace('Bearer ', '');
    const person = people.find((p) => p.token === token);
    if (url.endsWith('/project/modules/mine')) {
      return Response.json(
        Object.entries(person ? roles[person.name] : {}).map(([id, role]) => ({
          id,
          name: id === MOD ? 'Launch' : 'Other',
          projectId: 'p1',
          projectName: 'Apollo',
          role,
        }))
      );
    }
    const match = url.match(/\/project\/modules\/([^/?]+)$/);
    if (match) {
      const role = person && roles[person.name][decodeURIComponent(match[1])];
      return role ? Response.json({ userRole: role }) : new Response('{}', { status: 404 });
    }
    if (url.includes('/internal/verify')) return new Response('{}', { status: 401 });
    return realFetch(input, init);
  }) as any;

  await db.insert(users).values(people.map((p) => ({ id: p.id, name: p.name })));
  await db.insert(sessions).values(
    people.map((p) => ({ id: `s-${p.id}`, token: p.token, userId: p.id, expiresAt: new Date(Date.now() + 3_600_000) }))
  );
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  await db.delete(documents).where(inArray(documents.moduleId, [MOD, OTHER]));
  await db.delete(users).where(inArray(users.id, people.map((p) => p.id)));
});

let privateNote: string;
let sharedNote: string;
let readOnlyNote: string;

describe('identity', () => {
  it('answers health checks without a session', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
  });

  it('ignores an asserted X-User-Id and unsigned tokens', async () => {
    const forged = ['x', Buffer.from(JSON.stringify({ id: by('author').id })).toString('base64'), 'sig'].join('.');
    const viaHeader = await request(app).get(`/modules/${MOD}/documents`).set({ Authorization: 'Bearer nope', 'X-User-Id': by('author').id });
    const viaJwt = await request(app).get(`/modules/${MOD}/documents`).set({ Authorization: `Bearer ${forged}` });
    expect(viaHeader.status).toBe(401);
    expect(viaJwt.status).toBe(401);
  });
});

describe('notes', () => {
  it('creates notes in a module the caller can write to', async () => {
    const mk = async (body: any) => (await request(app).post(`/modules/${MOD}/documents`).set(as('author')).send(body)).body;
    privateNote = (await mk({ title: 'Diary', visibility: 'private', editPermission: 'editable' })).id;
    sharedNote = (await mk({ title: 'Launch plan', visibility: 'public', editPermission: 'editable' })).id;
    readOnlyNote = (await mk({ title: 'Policy', visibility: 'public', editPermission: 'read-only' })).id;

    await request(app)
      .patch(`/documents/${sharedNote}/content`)
      .set(as('author'))
      .send({ content: '<p>We launch on <strong>Friday</strong> &amp; email the press.</p>' })
      .expect(200);
  });

  it('refuses viewers and outsiders', async () => {
    const viewer = await request(app).post(`/modules/${MOD}/documents`).set(as('viewer')).send({ title: 'x' });
    const outsider = await request(app).post(`/modules/${MOD}/documents`).set(as('outsider')).send({ title: 'x' });
    expect(viewer.status).toBe(403);
    expect(outsider.status).toBe(404);
  });

  it('lists what each person may read, with text previews', async () => {
    const mine = (await request(app).get(`/modules/${MOD}/documents`).set(as('author'))).body;
    const theirs = (await request(app).get(`/modules/${MOD}/documents`).set(as('teammate'))).body;
    expect(mine.map((d: any) => d.title).sort()).toEqual(['Diary', 'Launch plan', 'Policy']);
    expect(theirs.map((d: any) => d.title).sort()).toEqual(['Launch plan', 'Policy']);
    expect(theirs.find((d: any) => d.id === sharedNote).previewText).toBe('We launch on Friday & email the press.');

    expect((await request(app).get(`/modules/${MOD}/documents`).set(as('outsider'))).status).toBe(404);
  });

  it('hides private notes as if they did not exist', async () => {
    expect((await request(app).get(`/documents/${privateNote}`).set(as('teammate'))).status).toBe(404);
  });

  it('lets teammates edit shared notes but not read-only ones', async () => {
    const shared = await request(app).get(`/documents/${sharedNote}`).set(as('teammate'));
    const policy = await request(app).get(`/documents/${readOnlyNote}`).set(as('teammate'));
    expect(shared.body.canEdit).toBe(true);
    expect(policy.body.canEdit).toBe(false);

    expect((await request(app).patch(`/documents/${sharedNote}/content`).set(as('teammate')).send({ content: '<p>edited</p>' })).status).toBe(200);
    expect((await request(app).patch(`/documents/${readOnlyNote}/content`).set(as('teammate')).send({ content: '<p>x</p>' })).status).toBe(403);
    expect((await request(app).patch(`/documents/${sharedNote}/content`).set(as('viewer')).send({ content: '<p>x</p>' })).status).toBe(403);
  });

  it('keeps title and sharing with the author', async () => {
    const res = await request(app).patch(`/documents/${sharedNote}`).set(as('teammate')).send({ title: 'Mine' });
    expect(res.status).toBe(403);
    const bad = await request(app).patch(`/documents/${sharedNote}`).set(as('author')).send({ visibility: 'secret' });
    expect(bad.status).toBe(400);
  });

  it('lets an admin delete someone else’s note', async () => {
    expect((await request(app).delete(`/documents/${readOnlyNote}`).set(as('teammate'))).status).toBe(403);
    expect((await request(app).delete(`/documents/${readOnlyNote}`).set(as('admin'))).status).toBe(204);
    expect((await request(app).get(`/documents/${readOnlyNote}`).set(as('author'))).status).toBe(404);
  });
});

describe('search', () => {
  it('finds readable notes by title or text across the caller’s modules', async () => {
    await request(app).post(`/modules/${OTHER}/documents`).set(as('author')).send({ title: 'Edited elsewhere', visibility: 'public' });

    const hits = (await request(app).get('/search').query({ q: 'edit' }).set(as('author'))).body;
    expect(hits.map((h: any) => h.title).sort()).toEqual(['Edited elsewhere', 'Launch plan']);
    expect(hits.find((h: any) => h.title === 'Launch plan')).toMatchObject({ moduleName: 'Launch', projectName: 'Apollo', snippet: 'edited' });

    // The teammate is not on the other module, and cannot see private notes.
    const theirs = (await request(app).get('/search').query({ q: 'e' + 'd' }).set(as('teammate'))).body;
    expect(theirs.map((h: any) => h.title)).toEqual(['Launch plan']);
  });

  it('needs at least two characters', async () => {
    expect((await request(app).get('/search').query({ q: 'e' }).set(as('author'))).body).toEqual([]);
  });
});
