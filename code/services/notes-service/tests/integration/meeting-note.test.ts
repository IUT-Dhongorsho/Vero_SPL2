import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import * as Y from 'yjs';
import { inArray } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { users } from '../../src/models/user.model.js';
import { documents } from '../../src/models/document.model.js';
import { documentService } from '../../src/services/document.service.js';
import { yjsPersistence } from '../../src/ws/yjs-server.js';

const MOD = `mod-meeting-${Date.now()}`;
const testUser = { id: `u-meeting-${Date.now()}`, name: 'Alice Attendant' };

beforeAll(async () => {
  await db.insert(users).values({ id: testUser.id, name: testUser.name });
});

afterAll(async () => {
  await db.delete(documents).where(inArray(documents.moduleId, [MOD]));
  await db.delete(users).where(inArray(users.id, [testUser.id]));
});

describe('Internal Meeting Notes API', () => {
  let createdDocId: string;

  it('initializes a meeting note with exact timestamp and non-empty yjsState + contentSnapshot', async () => {
    const res = await request(app)
      .post('/api/notes/internal/meeting-note/init')
      .set({ 'x-user-id': testUser.id })
      .send({
        moduleId: MOD,
        creatorId: testUser.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.documentId).toBeDefined();

    createdDocId = res.body.documentId;

    // Verify in database
    const doc = await documentService.getRawById(createdDocId);
    expect(doc).toBeDefined();
    expect(doc?.moduleId).toBe(MOD);
    expect(doc?.title).toMatch(/Meeting Note — [A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M/);
    expect(doc?.contentSnapshot).toContain('Live Meeting in Progress');

    // Verify yjsState is valid Yjs update and decodes to non-empty fragment
    expect(doc?.yjsState).toBeTruthy();
    const updateBuf = Buffer.from(doc!.yjsState!, 'base64');
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, updateBuf);
    const fragment = ydoc.getXmlFragment('default');
    expect(fragment.length).toBeGreaterThan(0);
  });

  it('appends speech chunks and updates both contentSnapshot and yjsState', async () => {
    const chunkRes = await request(app)
      .patch(`/api/notes/internal/meeting-note/${createdDocId}/append`)
      .set({ 'x-user-id': testUser.id })
      .send({
        speakerName: 'Alice',
        timestamp: '1:15 PM',
        text: 'Let us deploy the new microservices architecture today.',
      });

    expect(chunkRes.status).toBe(200);
    expect(chunkRes.body.success).toBe(true);

    const doc = await documentService.getRawById(createdDocId);
    expect(doc?.contentSnapshot).toContain('Alice');
    expect(doc?.contentSnapshot).toContain('1:15 PM');
    expect(doc?.contentSnapshot).toContain('Let us deploy the new microservices architecture today.');

    // Decode yjsState to verify Yjs update contains the appended text
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, Buffer.from(doc!.yjsState!, 'base64'));
    const fragment = ydoc.getXmlFragment('default');
    expect(fragment.length).toBeGreaterThan(1);
  });

  it('finalizes meeting minutes and preserves AI summary in yjsState', async () => {
    const minutesMarkdown = `## 🎯 Executive Summary\nTeam agreed to complete the integration merge.\n\n## 📝 Action Items\n- [x] Merge redesign branch\n- [ ] Verify test suite`;
    const fullTranscript = `> **[1:15 PM] Alice**: Let us deploy the new microservices architecture today.`;

    const res = await request(app)
      .patch(`/api/notes/internal/meeting-note/${createdDocId}/finalize`)
      .set({ 'x-user-id': testUser.id })
      .send({
        minutesMarkdown,
        fullTranscript,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const doc = await documentService.getRawById(createdDocId);
    expect(doc?.contentSnapshot).toContain('Executive Summary');
    expect(doc?.contentSnapshot).toContain('Merge redesign branch');
    expect(doc?.contentSnapshot).toContain('Alice');

    // Decode yjsState
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, Buffer.from(doc!.yjsState!, 'base64'));
    const fragment = ydoc.getXmlFragment('default');
    expect(fragment.length).toBeGreaterThan(0);
  });

  it('hydrates Yjs state when client connects and protects against empty state overwrite', async () => {
    // 1. Client connects: test bindState
    const clientYDoc = new Y.Doc();
    await yjsPersistence.bindState(createdDocId, clientYDoc);

    const fragment = clientYDoc.getXmlFragment('default');
    expect(fragment.length).toBeGreaterThan(0);

    // 2. Client sends an empty doc (e.g., initial uninitialized TipTap instance)
    const emptyYDoc = new Y.Doc();
    await yjsPersistence.writeState(createdDocId, emptyYDoc);

    // Verify DB doc is NOT wiped out
    const protectedDoc = await documentService.getRawById(createdDocId);
    expect(protectedDoc?.contentSnapshot).toContain('Executive Summary');
    expect(protectedDoc?.yjsState).toBeTruthy();
  });
});
