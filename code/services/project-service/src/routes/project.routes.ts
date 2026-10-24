import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';
import { moduleController } from '../controllers/module.controller.js';
import { memberController } from '../controllers/member.controller.js';
import { fileController, receiveUpload } from '../controllers/file.controller.js';
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

// ── Member Routes ───────────────────────────────────────────
router.get('/projects/:projectId/members',            memberController.list);
router.patch('/projects/:projectId/members/:userId',  memberController.updateRole);
router.delete('/projects/:projectId/members/:userId', memberController.remove);

// ── Module Routes ───────────────────────────────────────────
router.get('/projects/:projectId/modules',  moduleController.getProjectModules);
router.post('/modules',                     moduleController.createModule);
router.get('/modules/:moduleId',            moduleController.getModule);
router.patch('/modules/:moduleId',          moduleController.updateModule);
router.delete('/modules/:moduleId',         moduleController.deleteModule);
router.post('/modules/:moduleId/join',      moduleController.join);
router.post('/modules/:moduleId/members',   moduleController.addMembers);
router.delete('/modules/:moduleId/members/:userId', moduleController.removeMember);

// ── File Library Routes ─────────────────────────────────────
router.get('/files',                              fileController.recent);
router.get('/projects/:projectId/files',          fileController.list);
router.post('/projects/:projectId/files',         receiveUpload, fileController.upload);
router.post('/projects/:projectId/folders',       fileController.createFolder);
router.patch('/folders/:folderId',                fileController.renameFolder);
router.delete('/folders/:folderId',               fileController.deleteFolder);
router.get('/files/:fileId/content',              fileController.content);
router.patch('/files/:fileId',                    fileController.update);
router.delete('/files/:fileId',                   fileController.remove);

export default router;
