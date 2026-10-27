import http from 'http';
import { app } from './app.js';
import { env } from './config/env.js';
import { subscriberService } from './services/subscriber.service.js';
import { startOrchestrationWorker } from './worker/orchestrator.worker.js';
import { queueService } from './services/queue.service.js';

const server = http.createServer(app);

// Initialize Subscriber (Identity Sync)
subscriberService.init().catch(console.error);

// Initialize Background Orchestrator
startOrchestrationWorker();
queueService.queueMissingProvisioning().catch((e) => console.error('❌ Re-queueing module provisioning failed:', e.message));

server.listen(env.PORT, () => {
    console.log(`🚀 Project service running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});
