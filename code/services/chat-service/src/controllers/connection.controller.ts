import { Request, Response } from 'express';
import { connectionService, ensureUserReplicated } from '../services/connection.service.js';

function forwardedAuthHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (req.headers.cookie) headers.cookie = req.headers.cookie;
  return headers;
}

function fail(res: Response, error: any, fallback: string) {
  const status = error?.status ?? 500;
  if (status >= 500) console.error(`[connections] ${fallback}`, error);
  res.status(status).json({ error: status >= 500 ? fallback : error.message });
}

export const connectionController = {
  async list(req: Request, res: Response) {
    try {
      res.json(await connectionService.listFor((req as any).user.id));
    } catch (error) {
      fail(res, error, 'Failed to load connections');
    }
  },

  async request(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const targetId = String(req.body?.userId ?? '').trim();
      if (!targetId) return res.status(400).json({ error: 'userId is required' });

      const replicated = await ensureUserReplicated(targetId, forwardedAuthHeaders(req));
      if (!replicated) return res.status(404).json({ error: 'That user could not be found' });

      const result = await connectionService.request(userId, targetId, req.body?.message);
      res.status(result.created ? 201 : 200).json(result);
    } catch (error) {
      fail(res, error, 'Failed to send connection request');
    }
  },

  async accept(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const connection = await connectionService.accept(id, (req as any).user.id);
      res.json(connection);
    } catch (error) {
      fail(res, error, 'Failed to accept connection');
    }
  },

  async decline(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const connection = await connectionService.decline(id, (req as any).user.id);
      res.json(connection);
    } catch (error) {
      fail(res, error, 'Failed to decline connection');
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await connectionService.remove(id, (req as any).user.id);
      res.status(204).send();
    } catch (error) {
      fail(res, error, 'Failed to remove connection');
    }
  },
};
