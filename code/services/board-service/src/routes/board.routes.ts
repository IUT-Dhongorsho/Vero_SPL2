import { Router } from 'express';
import { boardController } from '../controllers/board.controller.js';

const router = Router();

router.post('/init/:projectId', boardController.initialize);

export default router;
