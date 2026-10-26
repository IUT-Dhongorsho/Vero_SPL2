import { Router } from 'express';
import { notificationController as c } from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', c.list);
router.get('/unread-count', c.unreadCount);
router.get('/preferences', c.preferences);
router.patch('/preferences', c.updatePreferences);
router.post('/push/subscriptions', c.subscribePush);
router.delete('/push/subscriptions', c.unsubscribePush);
router.patch('/read-all', c.markAllAsRead);
router.patch('/:id/read', c.markAsRead);
router.delete('/:id', c.remove);

export default router;
