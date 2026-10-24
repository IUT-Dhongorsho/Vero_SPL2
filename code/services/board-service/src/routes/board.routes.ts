import { Router } from 'express';
import { boardController } from '../controllers/board.controller.js';
import { fromParam, requireBoard } from '../middleware/access.js';

const router = Router();

router.post('/init/:projectId', requireBoard(fromParam('projectId'), 'read'), boardController.initialize);

export default router;
