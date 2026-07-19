import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';
import { moduleController } from '../controllers/module.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// ── Project Routes ──────────────────────────────────────────
router.get('/projects',              projectController.getUserProjects);
router.post('/projects/join',        projectController.joinProject);
router.get('/projects/:projectId',   projectController.getProject);
router.post('/projects',             projectController.createProject);
router.patch('/projects/:projectId', projectController.updateProject);
router.post('/projects/:projectId/invite-code', projectController.generateInviteCode);
router.delete('/projects/:projectId',projectController.deleteProject);

// ── Module Routes ───────────────────────────────────────────
router.get('/projects/:projectId/modules',  moduleController.getProjectModules);
router.post('/modules',                     moduleController.createModule);
router.patch('/modules/:moduleId',          moduleController.updateModule);
router.delete('/modules/:moduleId',         moduleController.deleteModule);

export default router;
