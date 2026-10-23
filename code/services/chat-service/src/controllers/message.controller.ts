import { Request, Response } from 'express';
import { messageService } from '../services/message.service.js';
import { channelService } from '../services/channel.service.js';

export class MessageController {
  async getChannelMessages(req: Request, res: Response) {
    try {
      const channelId = req.params.channelId as string;
      const userId = (req as any).user.id;

      if (!(await channelService.isMember(channelId, userId))) {
        return res.status(403).json({ error: 'Not a member of this channel' });
      }

      const limit = Number(req.query.limit) || 50;
      const before = typeof req.query.before === 'string' ? req.query.before : undefined;

      res.json(await messageService.getHistory(channelId, limit, before));
    } catch (error) {
      console.error('[messages:list]', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  async deleteMessage(req: Request, res: Response) {
    try {
      const messageId = String(req.params.messageId);
      const deleted = await messageService.softDelete(messageId, (req as any).user.id);
      if (!deleted) return res.status(404).json({ error: 'Message not found' });
      res.json(deleted);
    } catch (error) {
      console.error('[messages:delete]', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  }
}

export const messageController = new MessageController();
