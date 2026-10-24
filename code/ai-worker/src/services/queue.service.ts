import { Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { QUEUES } from '@repo/shared';
import { env } from '../config/env.js';
import { geminiService, GeminiError } from './gemini.service.js';
import { summarizeNote } from '../jobs/summarize.job.js';

/** Key other services read to know whether AI features can be offered. */
export const STATUS_KEY = 'ai-worker:status';
const HEARTBEAT_MS = 10_000;

export async function processAiJob(job: Pick<Job, 'name' | 'data'>) {
  try {
    switch (job.name) {
      case 'note.digest':
        return { ok: true, result: await summarizeNote(job.data) };
      default:
        return { ok: false, code: 'VALIDATION_FAILED', error: `Unknown AI job: ${job.name}` };
    }
  } catch (error: any) {
    // Expected failures are results, not crashes: BullMQ would otherwise retry
    // a request that will never succeed (no key, blocked content).
    if (error instanceof GeminiError) return { ok: false, code: error.code, error: error.message };
    if (error?.name === 'ZodError') return { ok: false, code: 'VALIDATION_FAILED', error: 'Malformed job input' };
    throw error;
  }
}

export function startAiWorker() {
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const statusClient = new Redis(env.REDIS_URL);

  const worker = new Worker(QUEUES.AI_JOBS, processAiJob, {
    connection,
    concurrency: env.AI_CONCURRENCY,
  });

  worker.on('failed', (job, err) => console.error(`💥 [ai-worker] ${job?.name} ${job?.id} failed:`, err.message));
  worker.on('completed', (job) => console.log(`✨ [ai-worker] ${job.name} ${job.id} done`));

  const beat = () =>
    statusClient
      .set(
        STATUS_KEY,
        JSON.stringify({ configured: geminiService.configured, model: geminiService.model, at: new Date().toISOString() }),
        'EX',
        Math.ceil((HEARTBEAT_MS * 3) / 1000)
      )
      .catch((e) => console.error('[ai-worker] heartbeat failed:', e.message));
  beat();
  const timer = setInterval(beat, HEARTBEAT_MS);

  return {
    worker,
    async close() {
      clearInterval(timer);
      await worker.close();
      await statusClient.del(STATUS_KEY).catch(() => {});
      statusClient.disconnect();
      connection.disconnect();
    },
  };
}
