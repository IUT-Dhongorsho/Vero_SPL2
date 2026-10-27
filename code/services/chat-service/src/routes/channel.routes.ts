import { Router } from 'express';
import { channelController } from '../controllers/channel.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.post('/', channelController.createChannel);
router.post('/direct', channelController.openDirectChannel);
router.get('/', channelController.getUserChannels);
router.get('/unread', channelController.unread);
router.get('/external/:externalId', channelController.getChannelByExternalId);
router.post('/:id/read', channelController.markRead);
router.get('/:id', channelController.getChannelById);

export default router;
