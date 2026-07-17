import * as mediasoup from 'mediasoup';
import os from 'os';
import { env } from '../config/env.js';
import { sfuWorkersGauge } from '../monitoring/metrics.js';

const workers: mediasoup.types.Worker[] = [];
let nextWorkerIndex = 0;

export async function createWorkerPool(): Promise<void> {
  const numWorkers = os.cpus().length;

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: env.NODE_ENV === 'production' ? 'warn' : 'debug',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
      rtcMinPort: env.MEDIASOUP_MIN_PORT,
      rtcMaxPort: env.MEDIASOUP_MAX_PORT,
    });

    worker.on('died', (error) => {
      console.error(`💀 [SFU:Worker] Worker[${i}] died: ${error.message}`);
      process.exit(1);
    });

    workers.push(worker);
    sfuWorkersGauge.set(workers.length);
    console.log(`✅ [SFU:Worker] Worker[${i}] created (PID ${worker.pid})`);
  }
}

export function getNextWorker(): mediasoup.types.Worker {
  const worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
}

export function getWorkers(): mediasoup.types.Worker[] {
  return workers;
}

export async function closeWorkerPool(): Promise<void> {
  for (const worker of workers) {
    worker.close();
  }
  workers.length = 0;
  sfuWorkersGauge.set(0);
  console.log('✅ [SFU:Worker] All workers closed');
}
