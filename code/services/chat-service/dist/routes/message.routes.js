import { Router } from 'express';
import { messageController } from '../controllers/message.controller.js';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
router.use(authMiddleware);
router.get('/:channelId', messageController.getChannelMessages);
export default router;
