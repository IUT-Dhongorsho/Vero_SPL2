import { Request, Response } from 'express';
import { columnService } from '../services/column.service.js';

export const columnController = {
  async getByProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const cols = await columnService.getColumnsByProject(projectId);
      res.json(cols);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch columns' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const col = await columnService.getColumnById(id);
      if (!col) return res.status(404).json({ error: 'Column not found' });
      res.json(col);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch column' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { name, projectId } = req.body;
      if (!name || !projectId) {
        return res.status(400).json({ error: 'name and projectId are required' });
      }
      const col = await columnService.createColumn({ name, projectId });
      res.status(201).json(col);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create column' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const col = await columnService.updateColumn(id, req.body);
      if (!col) return res.status(404).json({ error: 'Column not found' });
      res.json(col);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update column' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await columnService.deleteColumn(id);
      if (!deleted) return res.status(404).json({ error: 'Column not found' });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete column' });
    }
  },
};
