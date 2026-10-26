import { Response } from 'express';
import { documentService } from '../services/document.service.js';
import { NotesError } from '../services/access.service.js';
import { AuthRequest } from '../middleware/auth.js';
import { aiService } from '../services/ai.service.js';

function fail(res: Response, error: unknown, fallback: string) {
  if (error instanceof NotesError) return res.status(error.status).json({ error: error.message, code: error.code });
  console.error(`❌ [notes] ${fallback}:`, error);
  res.status(500).json({ error: fallback, code: 'INTERNAL' });
}

export const documentController = {
  async list(req: AuthRequest, res: Response) {
    try {
      res.json(await documentService.list(String(req.params.moduleId), req.userId!, req.authorization!));
    } catch (error) {
      fail(res, error, 'Failed to list notes');
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      res.json(await documentService.getById(String(req.params.id), req.userId!, req.authorization!));
    } catch (error) {
      fail(res, error, 'Failed to load note');
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const dto = { ...req.body, moduleId: String(req.params.moduleId || req.body?.moduleId || '') };
      res.status(201).json(await documentService.create(dto, req.userId!, req.authorization!));
    } catch (error) {
      fail(res, error, 'Failed to create note');
    }
  },

  async updateMeta(req: AuthRequest, res: Response) {
    try {
      res.json(await documentService.updateMeta(String(req.params.id), req.body ?? {}, req.userId!, req.authorization!));
    } catch (error) {
      fail(res, error, 'Failed to update note');
    }
  },

  async updateContent(req: AuthRequest, res: Response) {
    try {
      res.json(await documentService.updateContent(String(req.params.id), req.body?.content, req.userId!, req.authorization!));
    } catch (error) {
      fail(res, error, 'Failed to save note');
    }
  },

  async delete(req: AuthRequest, res: Response) {
    try {
      await documentService.delete(String(req.params.id), req.userId!, req.authorization!);
      res.status(204).send();
    } catch (error) {
      fail(res, error, 'Failed to delete note');
    }
  },

  /** GET /search?q= — notes the caller can read, across their modules. */
  async search(req: AuthRequest, res: Response) {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      res.json(await documentService.search(q, req.userId!, req.authorization!));
    } catch (error) {
      fail(res, error, 'Search failed');
    }
  },
};

export const aiController = {
  async status(_req: AuthRequest, res: Response) {
    try {
      res.json(await aiService.status());
    } catch (error) {
      fail(res, error, 'Could not check AI status');
    }
  },

  /** POST /documents/:id/digest — summary, key points and action items for a note. */
  async digest(req: AuthRequest, res: Response) {
    try {
      const { doc } = await documentService.load(String(req.params.id), req.userId!, req.authorization!);
      const html = aiService.currentHtml(doc.id, doc.contentSnapshot);
      res.json(await aiService.digest(req.userId!, { title: doc.title, html }));
    } catch (error) {
      fail(res, error, 'Could not summarise this note');
    }
  },
};
