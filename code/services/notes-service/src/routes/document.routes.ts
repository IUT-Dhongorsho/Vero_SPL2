import { Router } from 'express';
import { documentController, aiController } from '../controllers/document.controller.js';
import { authMiddleware } from '../middleware/auth.js';

export const documentRouter = Router();

documentRouter.use(authMiddleware);

documentRouter.get('/search', documentController.search);
documentRouter.get('/ai/status', aiController.status);
documentRouter.post('/documents/:id/digest', aiController.digest);

documentRouter.get('/modules/:moduleId/documents', documentController.list);
documentRouter.post('/modules/:moduleId/documents', documentController.create);

documentRouter.get('/documents/:id', documentController.getById);
documentRouter.patch('/documents/:id', documentController.updateMeta);
documentRouter.patch('/documents/:id/content', documentController.updateContent);
documentRouter.delete('/documents/:id', documentController.delete);
