import { Router } from 'express';
import { myWorkController, personalTaskController } from '../controllers/personalTask.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Auth is applied per-route rather than with `router.use` — this router is
// mounted on the shared `/api/board` prefix, so a router-level guard would also
// reject requests that are only passing through to the board routes below it.
router.get('/personal-tasks', requireAuth, personalTaskController.list);
router.post('/personal-tasks', requireAuth, personalTaskController.create);
router.patch('/personal-tasks/reorder', requireAuth, personalTaskController.reorder);
router.patch('/personal-tasks/:id', requireAuth, personalTaskController.update);
router.delete('/personal-tasks/:id', requireAuth, personalTaskController.remove);

// Personal Progress board: assigned project tasks + own tasks in one payload
router.get('/my/work', requireAuth, myWorkController.assigned);
router.get('/my/stats', requireAuth, myWorkController.stats);
// Calendar: every deadline in the projects the caller administers
router.get('/my/admin-deadlines', requireAuth, myWorkController.adminDeadlines);

export default router;
