import { Response } from 'express';
import { columnService } from '../services/column.service.js';
import { projectService } from '../services/project.service.js';
import type { BoardRequest } from '../middleware/access.js';

export const boardController = {
  /** POST /init/:boardId — makes sure the module's board exists with its default columns. */
  async initialize(req: BoardRequest, res: Response) {
    try {
      const board = req.board!;

      // Modules are owned by project-service; keep the local replica row (and
      // the names cross-board views show) in step with it.
      const replica = await projectService.ensureProjectReplica(board.boardId, {
        name: board.moduleName,
        ownerId: req.userId,
        parentProjectId: board.projectId,
        parentProjectName: board.projectName,
      });

      if (!replica) {
        return res.status(500).json({ error: 'Could not prepare the board for this module' });
      }

      const columns = await columnService.initializeBoard(board.boardId);
      res.json({ projectId: board.boardId, columns, canEdit: board.role !== 'viewer' });
    } catch (error) {
      console.error('[board:initialize]', error);
      res.status(500).json({ error: 'Failed to initialize board' });
    }
  },
};
