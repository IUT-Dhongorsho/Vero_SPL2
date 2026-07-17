import { Request, Response } from 'express';
import { columnService } from '../services/column.service.js';

export const boardController = {
  async initialize(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const columns = await columnService.initializeBoard(projectId);
      res.json({ projectId, columns });
    } catch (error) {
      res.status(500).json({ error: 'Failed to initialize board' });
    }
  },
};
