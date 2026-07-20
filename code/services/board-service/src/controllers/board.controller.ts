import { Request, Response } from 'express';
import { columnService } from '../services/column.service.js';
import { projectService } from '../services/project.service.js';

export const boardController = {
  async initialize(req: Request, res: Response) {
    try {
      const { projectId } = req.params;

      // Auto-create project stub in board_db if it doesn't exist
      // (projects are created in project-service, but board-service has its own DB)
      const existing = await projectService.getProjectById(projectId);
      if (!existing) {
        await projectService.createProject({
          id: projectId,
          name: req.body?.name || 'Project',
          description: req.body?.description || '',
          ownerId: req.body?.ownerId || 'system',
        });
      }

      const columns = await columnService.initializeBoard(projectId);
      res.json({ projectId, columns });
    } catch (error: any) {
      console.error('[BoardController] initialize error:', error.message);
      res.status(500).json({ error: 'Failed to initialize board' });
    }
  },
};
