import { Router } from 'express';
import { channelController } from '../controllers/channel.controller.js';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
router.use(authMiddleware);
router.post('/', channelController.createChannel);
router.get('/', channelController.getUserChannels);
export default router;
