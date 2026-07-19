import { Request, Response } from 'express';
import { documentService } from '../services/document.service.js';
import { AuthRequest } from '../middleware/auth.js';
import type { CreateNoteDTO, UpdateNoteMetaDTO } from '../../../../packages/shared/src/types/notes.types.js';

export const documentController = {
  async list(req: AuthRequest, res: Response) {
    try {
      const { moduleId } = req.params;
      const docs = await documentService.list(moduleId, req.userId!);
      res.json(docs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const doc = await documentService.getById(req.params.id, req.userId!);
      if (!doc) return res.status(404).json({ error: 'Not found' });
      res.json(doc);
    } catch (err: any) {
      if (err.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
      res.status(500).json({ error: err.message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const dto: CreateNoteDTO = req.body;
      const doc = await documentService.create(dto, req.userId!);
      res.status(201).json(doc);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async updateMeta(req: AuthRequest, res: Response) {
    try {
      const dto: UpdateNoteMetaDTO = req.body;
      const doc = await documentService.updateMeta(req.params.id, dto, req.userId!);
      res.json(doc);
    } catch (err: any) {
      if (err.message.includes('Forbidden')) return res.status(403).json({ error: err.message });
      if (err.message === 'Not found') return res.status(404).json({ error: 'Not found' });
      res.status(500).json({ error: err.message });
    }
  },

  async updateContent(req: AuthRequest, res: Response) {
    try {
      const { content } = req.body;
      const doc = await documentService.updateContent(req.params.id, content, req.userId!);
      res.json(doc);
    } catch (err: any) {
      if (err.message.includes('Forbidden')) return res.status(403).json({ error: err.message });
      if (err.message === 'Not found') return res.status(404).json({ error: 'Not found' });
      res.status(500).json({ error: err.message });
    }
  },

  async delete(req: AuthRequest, res: Response) {
    try {
      await documentService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (err: any) {
      if (err.message.includes('Forbidden')) return res.status(403).json({ error: err.message });
      if (err.message === 'Not found') return res.status(404).json({ error: 'Not found' });
      res.status(500).json({ error: err.message });
    }
  }
};
