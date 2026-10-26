import { Router } from 'express';
import { documentController, aiController } from '../controllers/document.controller.js';
import { meetingNoteController } from '../controllers/meeting-note.controller.js';
import { authMiddleware } from '../middleware/auth.js';

export const documentRouter = Router();

documentRouter.use(authMiddleware);

// Internal/service endpoints for live meeting transcripts & minutes
documentRouter.post('/internal/meeting-note/init', meetingNoteController.initMeetingNote);
documentRouter.patch('/internal/meeting-note/:id/append', meetingNoteController.appendTranscript);
documentRouter.patch('/internal/meeting-note/:id/finalize', meetingNoteController.finalizeMinutes);

documentRouter.get('/search', documentController.search);
documentRouter.get('/ai/status', aiController.status);
documentRouter.post('/documents/:id/digest', aiController.digest);

documentRouter.get('/modules/:moduleId/documents', documentController.list);
documentRouter.post('/modules/:moduleId/documents', documentController.create);

documentRouter.get('/documents/:id', documentController.getById);
documentRouter.patch('/documents/:id', documentController.updateMeta);
documentRouter.patch('/documents/:id/content', documentController.updateContent);
documentRouter.delete('/documents/:id', documentController.delete);
