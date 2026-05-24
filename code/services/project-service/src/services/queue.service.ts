import { Queue } from 'bullmq';
import { env } from '../config/env.js';
import { Redis } from 'ioredis';

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
    await orchestrationQueue.add('provision-module-resources', data);
    console.log(`📦 [QueueService] Queued resource provisioning for module: ${data.moduleId}`);
  }
};
