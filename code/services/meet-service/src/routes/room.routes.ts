import { Router } from 'express';
import { roomController } from '../controllers/room.controller.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.use(rateLimit);
router.get('/:roomId', roomController.getRoomStatus);
router.get('/:roomId/history', roomController.getRoomHistory);

export default router;
