import { Router } from 'express';
import { getNotifications, getUnreadCount } from '../controllers/notification.controller.js';
import { markAsRead, markAllAsRead, deleteNotification } from '../controllers/notification-action.controller.js';

const router = Router();

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

export default router;
