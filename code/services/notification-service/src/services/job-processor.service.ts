import { Worker, Job } from 'bullmq';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { scheduledJobs } from '../models/scheduled-job.model.js';
import { eq, and } from 'drizzle-orm';
import { Redis } from 'ioredis';
import { taskHandler } from './handlers/task.handler.js';
import { meetHandler } from './handlers/meet.handler.js';

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export class JobProcessorService {
  init() {
    const worker = new Worker(
      'notification-scheduling',
      async (job: Job) => {
        const { type, entityId, userId, data } = job.data;
        
        console.log(`🔥 Processing scheduled notification: ${type} for user ${userId}`);

        try {
          // 1. Route to correct handler based on type
          if (type.startsWith('task.')) {
            await taskHandler.handle({ type, data });
          } else if (type.startsWith('meet.')) {
            await meetHandler.handle({ type, data });
          }

          // 2. Mark job as fired in DB
          if (job.id) {
            await db.update(scheduledJobs)
              .set({ status: 'fired' })
              .where(eq(scheduledJobs.bullmqJobId, job.id));
          }
        } catch (error) {
          console.error(`❌ Failed to process scheduled job ${job.id}:`, error);
          throw error;
        }
      },
      { connection }
    );

    worker.on('completed', (job) => {
      console.log(`✅ Scheduled job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`💥 Scheduled job ${job?.id} failed:`, err);
    });

    console.log('👷 Notification Job Processor started');
  }
}

export const jobProcessorService = new JobProcessorService();
