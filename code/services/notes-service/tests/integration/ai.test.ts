import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { eq } from 'drizzle-orm';
import { QUEUES } from '@repo/shared';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { env } from '../../src/config/env.js';
import { users, sessions } from '../../src/models/user.model.js';
import { documents } from '../../src/models/document.model.js';

// The real queue, on local Redis, with a stand-in for ai-worker.
const MOD = `mod-ai-${Date.now()}`;
const me = { id: `ai-user-${Date.now()}`, token: crypto.randomBytes(16).toString('hex') };
const auth = { Authorization: `Bearer ${me.token}` };
const redis = new Redis(env.REDIS_URL);
let worker: Worker;
let noteId: string;
const seen: any[] = [];

const realFetch = globalThis.fetch;
beforeAll(async () => {
  globalThis.fetch = vi.fn(async (input: any, init?: any) =>
    String(input).includes(`/project/modules/${MOD}`) ? Response.json({ userRole: 'member' }) : realFetch(input, init)
  ) as any;

  await db.insert(users).values({ id: me.id, name: 'AI Tester' });
  await db.insert(sessions).values({ id: `s-${me.id}`, token: me.token, userId: me.id, expiresAt: new Date(Date.now() + 3_600_000) });
  const [doc] = await db
    .insert(documents)
    .values({ moduleId: MOD, creatorId: me.id, title: 'Standup', contentSnapshot: '<p>Ship it. Email press.</p>' })
    .returning();
  noteId = doc.id;

  worker = new Worker(
    QUEUES.AI_JOBS,
    async (job) => {
      seen.push({ name: job.name, data: job.data });
      return { ok: true, result: { summary: 'Shipping.', keyPoints: [], actionItems: [{ title: 'Email press', detail: '', priority: 'high' }] } };
    },
    { connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }) }
  );
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  await worker.close();
  await redis.del('ai-worker:status');
  redis.disconnect();
  await db.delete(documents).where(eq(documents.id, noteId));
  await db.delete(users).where(eq(users.id, me.id));
});

describe('AI digest', () => {
  it('reports the worker offline when there is no heartbeat', async () => {
    await redis.del('ai-worker:status');
    expect((await request(app).get('/ai/status').set(auth)).body).toMatchObject({ available: false, reason: 'worker_offline' });
    expect((await request(app).post(`/documents/${noteId}/digest`).set(auth)).status).toBe(503);
  });

  it('reports a worker without a key as not configured', async () => {
    await redis.set('ai-worker:status', JSON.stringify({ configured: false, model: null }), 'EX', 30);
    expect((await request(app).get('/ai/status').set(auth)).body.reason).toBe('not_configured');
  });

  it('queues the note and returns the worker’s digest', async () => {
    await redis.set('ai-worker:status', JSON.stringify({ configured: true, model: 'gemini-test' }), 'EX', 30);

    const res = await request(app).post(`/documents/${noteId}/digest`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.actionItems[0].title).toBe('Email press');
    expect(seen.at(-1)).toEqual({ name: 'note.digest', data: { title: 'Standup', html: '<p>Ship it. Email press.</p>' } });
  });

  it('rate limits each person', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await request(app).post(`/documents/${noteId}/digest`).set(auth)).status);
    expect(statuses).toContain(429);
  });
});
