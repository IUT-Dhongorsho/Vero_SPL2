import { Queue } from 'bullmq';
import { isNull } from 'drizzle-orm';
import { env } from '../config/env.js';
import { Redis } from 'ioredis';
import { db } from '../db/client.js';
import { modules } from '../models/workspace.model.js';

const connection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null
});

export const orchestrationQueue = new Queue('resource-orchestration', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
  },
});

export const queueService = {
  /**
   * Adds a job to provision resources for a module.
   */
  async queueModuleProvisioning(data: {
    moduleId: string;
    name: string;
    projectId: string;
    workspaceId: string;
  }) {
    // One job id per module: replicas re-queueing the same module at startup
    // collapse into a single job while it is waiting.
    await orchestrationQueue.add('provision-module-resources', data, { jobId: `provision-${data.moduleId}` });
    console.log(`📦 [QueueService] Queued resource provisioning for module: ${data.moduleId}`);
  },

  /**
   * Re-queues every module that still has no chat channel: modules created
   * before provisioning existed, or whose job was lost (Redis down at creation,
   * retries exhausted while chat-service was offline). The job is idempotent.
   */
  async queueMissingProvisioning() {
    const pending = await db
      .select({ id: modules.id, name: modules.name, projectId: modules.projectId })
      .from(modules)
      .where(isNull(modules.chatResourceId));

    for (const m of pending) {
      await this.queueModuleProvisioning({ moduleId: m.id, name: m.name, projectId: m.projectId, workspaceId: '' });
    }
    if (pending.length) console.log(`🔁 [QueueService] Re-queued provisioning for ${pending.length} module(s) without chat`);
  },
};
