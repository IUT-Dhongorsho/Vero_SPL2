import { Worker, Job } from 'bullmq';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { modules } from '../models/workspace.model.js';
import { createChatChannel } from '../grpc/client.js';
import { eq } from 'drizzle-orm';
import { Redis } from 'ioredis';

const connection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null
});

export const startOrchestrationWorker = () => {
  const worker = new Worker(
    'resource-orchestration',
    async (job: Job) => {
      if (job.name === 'provision-module-resources') {
        const { moduleId, name, workspaceId } = job.data;
        
        console.log(`⚙️ [OrchestrationWorker] Provisioning resources for module: ${moduleId}`);

        try {
          // 1. Provision CHAT (Verified gRPC Path)
          const chatResponse = await createChatChannel({
            name: `${name} Chat`,
            type: 'group',
            externalId: moduleId,
            workspaceId,
          });

          if (chatResponse.success && chatResponse.id) {
            await db.update(modules)
              .set({ chatResourceId: chatResponse.id })
              .where(eq(modules.id, moduleId));
            
            console.log(`✅ [OrchestrationWorker] Chat provisioned: ${chatResponse.id}`);
          }

          // Future: 2. Provision BOARD
          // Future: 3. Provision NOTES
          // Future: 4. Provision SIGNALING

          console.log(`✨ [OrchestrationWorker] All available resources provisioned for ${moduleId}`);
        } catch (error: any) {
          console.error(`❌ [OrchestrationWorker] Provisioning failed for ${moduleId}:`, error.message);
          throw error;
        }
      }
    },
    { connection }
  );

  worker.on('completed', (job) => {
    console.log(`✨ [OrchestrationWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 [OrchestrationWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('📡 Orchestration Worker started');
};
