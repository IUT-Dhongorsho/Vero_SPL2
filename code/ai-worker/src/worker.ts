import { startAiWorker } from './services/queue.service.js';
import { geminiService } from './services/gemini.service.js';
import { startMetricsServer } from './services/metrics.service.js';

const running = startAiWorker();
const metrics = startMetricsServer();

console.log(
  geminiService.configured
    ? `🤖 AI worker ready${geminiService.model ? ` (model ${geminiService.model})` : ' (model chosen on first job)'}`
    : '🤖 AI worker running without GEMINI_API_KEY — jobs will answer NOT_CONFIGURED'
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await running.close();
    metrics.close();
    process.exit(0);
  });
}
