import { Router } from 'express';
import { taskController } from '../controllers/task.controller.js';
import { fromColumn, fromParam, fromTask, requireBoard } from '../middleware/access.js';

const router = Router();

router.get('/detail/:id', requireBoard(fromTask(), 'read'), taskController.getById);
router.get('/:projectId', requireBoard(fromParam('projectId'), 'read'), taskController.getByProject);
router.post('/', requireBoard(fromColumn((req) => req.body?.columnId), 'write'), taskController.create);
router.patch('/:id', requireBoard(fromTask(), 'write'), taskController.update);
router.delete('/:id', requireBoard(fromTask(), 'write'), taskController.delete);
router.patch('/:id/move', requireBoard(fromTask(), 'write'), taskController.move);

export default router;
