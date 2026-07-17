import { createWorkerPool, closeWorkerPool } from '../sfu/worker.js';

export const sfuService = {
  async init(): Promise<void> {
    console.log('🚀 [SFU] Initialising mediasoup worker pool...');
    await createWorkerPool();
    console.log('✅ [SFU] Worker pool ready');
  },

  async shutdown(): Promise<void> {
    console.log('🛑 [SFU] Shutting down worker pool...');
    await closeWorkerPool();
  },
};
