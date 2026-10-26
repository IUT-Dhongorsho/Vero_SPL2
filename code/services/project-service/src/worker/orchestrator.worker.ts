import { Worker, Job } from 'bullmq';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { modules } from '../models/workspace.model.js';
import { createChatChannel } from '../grpc/client.js';
import { chatSyncService } from '../services/chat-sync.service.js';
import { eq } from 'drizzle-orm';
import { Redis } from 'ioredis';

/**
 * Provisions the resources a module needs from other services. Board and notes
 * key their data by module id and need nothing created up front; chat needs a
 * channel, which chat-service creates over gRPC.
 *
 * Idempotent: a retried job for a module that already has its channel only
 * re-syncs membership instead of creating a second channel.
 */
export async function processOrchestrationJob(job: Pick<Job, 'name' | 'data'>) {
  if (job.name !== 'provision-module-resources') return;

  const { moduleId, name, workspaceId } = job.data;
  console.log(`⚙️ [OrchestrationWorker] Provisioning resources for module: ${moduleId}`);

  try {
    const existing = await db.query.modules.findFirst({ where: eq(modules.id, moduleId) });
    if (!existing) {
      console.warn(`⚠️ [OrchestrationWorker] Module ${moduleId} no longer exists — skipping`);
      return;
    }

    if (!existing.chatResourceId) {
      const chatResponse = await createChatChannel({
        name: `${name} Chat`,
        type: 'group',
        externalId: moduleId,
        workspaceId,
      });

      if (!chatResponse.success || !chatResponse.id) {
        throw new Error(chatResponse.message || 'chat-service did not return a channel');
      }

      await db.update(modules)
        .set({ chatResourceId: chatResponse.id })
        .where(eq(modules.id, moduleId));

      console.log(`✅ [OrchestrationWorker] Chat provisioned: ${chatResponse.id}`);
    }

    // The channel is created by the system user; bring in everyone who
    // already belongs to the module.
    await chatSyncService.addAllMembers(moduleId);

    console.log(`✨ [OrchestrationWorker] All available resources provisioned for ${moduleId}`);
  } catch (error: any) {
    console.error(`❌ [OrchestrationWorker] Provisioning failed for ${moduleId}:`, error.message);
    throw error;
  }
}

export const startOrchestrationWorker = () => {
  const connection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null
  });

  const worker = new Worker('resource-orchestration', processOrchestrationJob, { connection });

  worker.on('completed', (job) => {
    console.log(`✨ [OrchestrationWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 [OrchestrationWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('📡 Orchestration Worker started');
};
