import { Router } from 'express';
import { workspaceController } from '../controllers/workspace.controller.js';
import { projectController } from '../controllers/project.controller.js';
import { moduleController } from '../controllers/module.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// Workspace Routes
router.get('/workspaces', workspaceController.getMyWorkspaces);
router.get('/workspaces/:id', workspaceController.getWorkspaceById);

// Project Routes
router.post('/projects', projectController.createProject);
router.get('/workspaces/:workspaceId/projects', projectController.getWorkspaceProjects);

// Module Routes
router.post('/modules', moduleController.createModule);
router.get('/projects/:projectId/modules', moduleController.getProjectModules);

export default router;
