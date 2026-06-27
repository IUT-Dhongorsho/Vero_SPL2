import { Queue } from 'bullmq';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { scheduledJobs } from '../models/scheduled-job.model.js';
import { Redis } from 'ioredis';
import { eq } from 'drizzle-orm';

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const notificationQueue = new Queue('notification-scheduling', { connection });

export class SchedulerService {
  async schedule(options: {
    type: string;
    entityId: string;
    userId: string;
    scheduledFor: Date;
    data: any;
  }) {
    const { type, entityId, userId, scheduledFor, data } = options;
    const delay = scheduledFor.getTime() - Date.now();

    if (delay < 0) {
      console.warn('⚠️ Cannot schedule notification in the past');
      return;
    }

    const job = await notificationQueue.add(
      'scheduled-notification',
      { type, entityId, userId, data },
      { delay }
    );

    if (job.id) {
      await db.insert(scheduledJobs).values({
        bullmqJobId: job.id,
        notificationType: type,
        entityId,
        targetUserId: userId,
        scheduledFor,
        status: 'pending',
      });
      console.log(`⏰ Notification scheduled: ${type} for user ${userId} at ${scheduledFor}`);
    }

    return job;
  }

  async cancel(entityId: string, userId?: string) {
    // Find pending jobs for this entity
    const query = db.select().from(scheduledJobs).where(eq(scheduledJobs.entityId, entityId));
    // ... logic to filter and cancel BullMQ jobs
    // This requires iterating and calling job.remove()
  }
}

export const schedulerService = new SchedulerService();
