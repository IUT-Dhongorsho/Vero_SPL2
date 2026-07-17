import { Router } from 'express';
import { taskController } from '../controllers/task.controller.js';

const router = Router();

router.get('/detail/:id', taskController.getById);
router.get('/:projectId', taskController.getByProject);
router.post('/', taskController.create);
router.patch('/:id', taskController.update);
router.delete('/:id', taskController.delete);
router.patch('/:id/move', taskController.move);

export default router;
