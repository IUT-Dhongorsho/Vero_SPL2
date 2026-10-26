import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Uploads go to a throwaway directory, never the dev upload folder. Hoisted so
// it is set before the service's env module is imported.
const uploadDir = vi.hoisted(() => {
  const dir = require('node:fs').mkdtempSync(require('node:path').join(require('node:os').tmpdir(), 'vero-files-'));
  process.env.UPLOAD_DIR = dir;
  return dir as string;
});

vi.mock('../../src/grpc/client.js', () => ({
  createChatChannel: vi.fn(),
  addChatMembers: vi.fn(),
  removeChatMembers: vi.fn(),
}));
vi.mock('../../src/services/queue.service.js', () => ({
  queueService: { queueModuleProvisioning: vi.fn(async () => undefined) },
}));
vi.mock('../../src/services/publisher.service.js', () => ({
  publisherService: { project: vi.fn(async () => undefined), resource: vi.fn(async () => undefined) },
}));

import request from 'supertest';
import { app } from '../../src/app.js';
import { publisherService } from '../../src/services/publisher.service.js';
import { seedUsers, cleanup, type TestUser } from '../helpers.js';

let admin: TestUser, member: TestUser, viewer: TestUser, outsider: TestUser;
let projectId: string;
let otherProjectId: string;

const storedFiles = () => fs.readdirSync(uploadDir).filter((f) => !f.startsWith('.'));

beforeAll(async () => {
  [admin, member, viewer, outsider] = await seedUsers(['Admin', 'Member', 'Viewer', 'Outsider']);

  const project = await request(app).post('/project/projects').set(admin.auth).send({ name: 'Library' });
  projectId = project.body.id;
  const other = await request(app).post('/project/projects').set(outsider.auth).send({ name: 'Elsewhere' });
  otherProjectId = other.body.id;

  for (const user of [member, viewer]) {
    await request(app).post('/project/projects/join').set(user.auth).send({ inviteCode: project.body.inviteCode });
  }
  await request(app)
    .patch(`/project/projects/${projectId}/members/${viewer.id}`)
    .set(admin.auth)
    .send({ role: 'viewer' });
});

afterAll(async () => {
  await cleanup([admin, member, viewer, outsider].map((u) => u.id), [projectId, otherProjectId]);
  fs.rmSync(uploadDir, { recursive: true, force: true });
});

describe('folders', () => {
  let specsId: string;

  it('creates a folder at the root', async () => {
    const res = await request(app).post(`/project/projects/${projectId}/folders`).set(member.auth).send({ name: 'Specs' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Specs', parentId: null, items: 0 });
    specsId = res.body.id;
  });

  it('rejects a duplicate name in the same place, ignoring case', async () => {
    const res = await request(app).post(`/project/projects/${projectId}/folders`).set(admin.auth).send({ name: 'specs' });
    expect(res.status).toBe(409);
  });

  it('nests folders and reports the breadcrumb', async () => {
    const child = await request(app)
      .post(`/project/projects/${projectId}/folders`)
      .set(member.auth)
      .send({ name: 'Drafts', parentId: specsId });
    expect(child.status).toBe(201);

    const listing = await request(app)
      .get(`/project/projects/${projectId}/files`)
      .query({ folderId: child.body.id })
      .set(member.auth);
    expect(listing.body.breadcrumb.map((b: any) => b.name)).toEqual(['Specs', 'Drafts']);
  });

  it('does not let viewers create folders', async () => {
    const res = await request(app).post(`/project/projects/${projectId}/folders`).set(viewer.auth).send({ name: 'Nope' });
    expect(res.status).toBe(403);
  });
});

describe('files', () => {
  let fileId: string;

  it('uploads several files, keeping UTF-8 names, and announces them', async () => {
    const res = await request(app)
      .post(`/project/projects/${projectId}/files`)
      .set(member.auth)
      .attach('files', Buffer.from('# Plan\n'), { filename: 'plan.md', contentType: 'text/markdown' })
      .attach('files', Buffer.from('%PDF-1.4'), { filename: 'résumé.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body.map((f: any) => f.name).sort()).toEqual(['plan.md', 'résumé.pdf']);
    expect(res.body[0].uploader.id).toBe(member.id);
    expect(storedFiles()).toHaveLength(2);
    expect(publisherService.resource).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'file.uploaded',
        data: expect.objectContaining({ recipientIds: expect.arrayContaining([admin.id, viewer.id]) }),
      })
    );
    fileId = res.body.find((f: any) => f.name === 'plan.md').id;
  });

  it('refuses executables and leaves nothing on disk', async () => {
    const before = storedFiles().length;
    const res = await request(app)
      .post(`/project/projects/${projectId}/files`)
      .set(member.auth)
      .attach('files', Buffer.from('echo hi'), 'install.sh');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('FILE_TYPE_BLOCKED');
    expect(storedFiles()).toHaveLength(before);
  });

  it('refuses uploads from viewers and cleans up the bytes', async () => {
    const before = storedFiles().length;
    const res = await request(app)
      .post(`/project/projects/${projectId}/files`)
      .set(viewer.auth)
      .attach('files', Buffer.from('x'), 'note.txt');
    expect(res.status).toBe(403);
    expect(storedFiles()).toHaveLength(before);
  });

  it('streams the content to members only', async () => {
    const res = await request(app).get(`/project/files/${fileId}/content`).set(viewer.auth);
    expect(res.status).toBe(200);
    expect(res.text).toBe('# Plan\n');
    expect(res.headers['content-disposition']).toMatch(/^attachment/); // markdown is not rendered inline

    const pdf = (await request(app).get(`/project/projects/${projectId}/files`).set(admin.auth)).body.files.find(
      (f: any) => f.name === 'résumé.pdf'
    );
    const inline = await request(app).get(`/project/files/${pdf.id}/content`).set(admin.auth);
    expect(inline.headers['content-disposition']).toMatch(/^inline/);
    expect(inline.headers['content-disposition']).toContain("filename*=UTF-8''r%C3%A9sum%C3%A9.pdf");

    const denied = await request(app).get(`/project/files/${fileId}/content`).set(outsider.auth);
    expect(denied.status).toBe(404);
  });

  it('renames and moves a file', async () => {
    const folder = await request(app).post(`/project/projects/${projectId}/folders`).set(admin.auth).send({ name: 'Archive' });
    const res = await request(app)
      .patch(`/project/files/${fileId}`)
      .set(member.auth)
      .send({ name: 'plan-v2.md', folderId: folder.body.id });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'plan-v2.md', folderId: folder.body.id });

    const root = await request(app).get(`/project/projects/${projectId}/files`).set(member.auth);
    expect(root.body.folders.find((f: any) => f.name === 'Archive').items).toBe(1);
  });

  it('refuses to move a file into another project’s folder', async () => {
    const foreign = await request(app)
      .post(`/project/projects/${otherProjectId}/folders`)
      .set(outsider.auth)
      .send({ name: 'Theirs' });
    const res = await request(app).patch(`/project/files/${fileId}`).set(member.auth).send({ folderId: foreign.body.id });
    expect(res.status).toBe(404);
  });

  it('lists recent files across the caller’s projects, with search', async () => {
    const all = await request(app).get('/project/files').set(member.auth);
    expect(all.body.every((f: any) => f.project.id === projectId)).toBe(true);
    expect(all.body).toHaveLength(2);

    const found = await request(app).get('/project/files').query({ q: 'résumé' }).set(member.auth);
    expect(found.body.map((f: any) => f.name)).toEqual(['résumé.pdf']);

    const none = await request(app).get('/project/files').set(outsider.auth);
    expect(none.body).toEqual([]);
  });

  it('only lets the uploader or an admin delete a file', async () => {
    const files = (await request(app).get(`/project/projects/${projectId}/files`).set(admin.auth)).body.files;
    const pdf = files.find((f: any) => f.name === 'résumé.pdf');

    const otherAdminUpload = await request(app)
      .post(`/project/projects/${projectId}/files`)
      .set(admin.auth)
      .attach('files', Buffer.from('a,b'), 'data.csv');
    const denied = await request(app).delete(`/project/files/${otherAdminUpload.body[0].id}`).set(member.auth);
    expect(denied.status).toBe(403);

    const before = storedFiles().length;
    const ok = await request(app).delete(`/project/files/${pdf.id}`).set(member.auth);
    expect(ok.status).toBe(200);
    expect(storedFiles()).toHaveLength(before - 1);
  });

  it('deletes a folder with everything inside, bytes included', async () => {
    const root = await request(app).get(`/project/projects/${projectId}/files`).set(admin.auth);
    const archive = root.body.folders.find((f: any) => f.name === 'Archive');
    const before = storedFiles().length;

    const res = await request(app).delete(`/project/folders/${archive.id}`).set(admin.auth);
    expect(res.status).toBe(200);
    expect(res.body.filesRemoved).toBe(1);
    expect(storedFiles()).toHaveLength(before - 1);
  });
});
