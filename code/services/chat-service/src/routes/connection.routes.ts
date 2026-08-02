import { Router } from 'express';
import { connectionController } from '../controllers/connection.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', connectionController.list);
router.post('/request', connectionController.request);
router.post('/:id/accept', connectionController.accept);
router.post('/:id/decline', connectionController.decline);
router.delete('/:id', connectionController.remove);

export default router;
