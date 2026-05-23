import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';
import { metricsController } from '../controllers/metrics.controller.js';

const router = Router();

router.get('/health', healthController.check);
router.get('/metrics', metricsController.getMetrics);

export default router;
