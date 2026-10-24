import { Router } from 'express';
import { columnController } from '../controllers/column.controller.js';
import { fromColumn, fromParam, requireBoard } from '../middleware/access.js';

const router = Router();

router.get('/:projectId', requireBoard(fromParam('projectId'), 'read'), columnController.getByProject);
router.post('/', requireBoard((req) => req.body?.projectId ?? null, 'write'), columnController.create);
router.patch('/:id', requireBoard(fromColumn((req) => req.params.id), 'write'), columnController.update);
router.delete('/:id', requireBoard(fromColumn((req) => req.params.id), 'write'), columnController.delete);

export default router;
