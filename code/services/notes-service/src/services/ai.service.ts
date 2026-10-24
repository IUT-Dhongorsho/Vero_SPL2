import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
// @ts-ignore — y-websocket ships its server helpers untyped
import { docs as liveDocs } from 'y-websocket/bin/utils';
import { QUEUES } from '@repo/shared';
import { env } from '../config/env.js';
import { NotesError } from './access.service.js';
import { ydocToHtml } from './ydoc-html.js';

/** Written by ai-worker every few seconds while it runs. */
const STATUS_KEY = `${env.AI_NAMESPACE ? `${env.AI_NAMESPACE}:` : ''}ai-worker:status`;
/** BullMQ key prefix, namespaced the same way as ai-worker's. */
export const AI_QUEUE_PREFIX = env.AI_NAMESPACE ? `bull:${env.AI_NAMESPACE}` : 'bull';
// Current Flash models can take a minute or more on a long note.
const WAIT_MS = 120_000;
const PER_MINUTE = 6;

let redis: Redis | null = null;
let queue: Queue | null = null;
let events: QueueEvents | null = null;

function connections() {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
    const bull = { connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }) };
    queue = new Queue(QUEUES.AI_JOBS, { ...bull, prefix: AI_QUEUE_PREFIX, defaultJobOptions: { removeOnComplete: 100, removeOnFail: 100, attempts: 1 } });
    events = new QueueEvents(QUEUES.AI_JOBS, { prefix: AI_QUEUE_PREFIX, connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }) });
  }
  return { redis: redis!, queue: queue!, events: events! };
}

export interface AiStatus {
  available: boolean;
  reason: 'ok' | 'worker_offline' | 'not_configured';
  model: string | null;
}

export const aiService = {
  async status(): Promise<AiStatus> {
    const raw = await connections().redis.get(STATUS_KEY).catch(() => null);
    if (!raw) return { available: false, reason: 'worker_offline', model: null };
    const status = JSON.parse(raw) as { configured: boolean; model: string | null };
    return status.configured
      ? { available: true, reason: 'ok', model: status.model }
      : { available: false, reason: 'not_configured', model: null };
  },

  /** The note as it is right now — a live collaborative session beats the last save. */
  currentHtml(documentId: string, savedHtml: string) {
    const live = (liveDocs as Map<string, any>).get(documentId);
    return live ? ydocToHtml(live) : savedHtml;
  },

  async digest(userId: string, input: { title: string; html: string }) {
    const status = await this.status();
    if (!status.available) {
      throw new NotesError(
        503,
        status.reason === 'not_configured' ? 'AI is not set up on this server yet' : 'The AI worker is not running',
        'NOT_CONFIGURED'
      );
    }

    const { redis, queue, events } = connections();
    const bucket = `ai:rate:${userId}:${Math.floor(Date.now() / 60_000)}`;
    const used = await redis.incr(bucket);
    if (used === 1) await redis.expire(bucket, 70);
    if (used > PER_MINUTE) throw new NotesError(429, 'Too many AI requests — try again in a minute', 'RATE_LIMITED');

    const job = await queue.add('note.digest', input);
    let outcome: any;
    try {
      outcome = await job.waitUntilFinished(events, WAIT_MS);
    } catch (error: any) {
      throw new NotesError(504, 'The AI took too long to answer', 'UPSTREAM_FAILED');
    }

    if (!outcome?.ok) {
      const status = outcome?.code === 'NOT_CONFIGURED' ? 503 : outcome?.code === 'BLOCKED' ? 422 : 502;
      throw new NotesError(status, outcome?.error ?? 'The AI could not process this note', outcome?.code ?? 'UPSTREAM_FAILED');
    }
    return outcome.result;
  },
};
