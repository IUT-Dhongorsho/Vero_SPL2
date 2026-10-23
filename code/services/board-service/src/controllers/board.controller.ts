import { Response } from 'express';
import { columnService } from '../services/column.service.js';
import { projectService } from '../services/project.service.js';
import { resolveUser, type AuthedRequest } from '../middleware/auth.js';

export const boardController = {
  async initialize(req: AuthedRequest, res: Response) {
    try {
      const projectId = String(req.params.projectId);

      // Projects are owned by project-service; make sure the local replica row
      // exists before the columns try to reference it.
      await resolveUser(req);
      const replica = await projectService.ensureProjectReplica(projectId, {
        name: req.body?.name,
        ownerId: req.userId || req.body?.ownerId || 'system',
      });

      if (!replica) {
        return res.status(500).json({ error: 'Could not prepare the board for this project' });
      }

      const columns = await columnService.initializeBoard(projectId);
      res.json({ projectId, columns });
    } catch (error) {
      console.error('[board:initialize]', error);
      res.status(500).json({ error: 'Failed to initialize board' });
    }
  },
};
