import { Router } from 'express';
import { columnController } from '../controllers/column.controller.js';

const router = Router();

router.get('/:projectId', columnController.getByProject);
router.post('/', columnController.create);
router.patch('/:id', columnController.update);
router.delete('/:id', columnController.delete);

export default router;
