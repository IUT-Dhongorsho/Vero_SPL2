import { Request, Response } from 'express';
import { db } from '../db/client.js';
import { channels, channelMembers } from '../models/channel.model.js';
import { eq, and } from 'drizzle-orm';

export class ChannelController {
  async createChannel(req: Request, res: Response) {
    try {
      const { name, type, memberIds } = req.body;
      const userId = (req as any).user.id;

      const [newChannel] = await db.insert(channels).values({
        name,
        type,
      }).returning();

      // Add creator as admin
      await db.insert(channelMembers).values({
        channelId: newChannel.id,
        userId: userId,
        role: 'admin',
      });

      // Add other members
      if (memberIds && Array.isArray(memberIds)) {
        const otherMembers = memberIds.map((id: string) => ({
          channelId: newChannel.id,
          userId: id,
          role: 'member',
        }));
        if (otherMembers.length > 0) {
          await db.insert(channelMembers).values(otherMembers);
        }
      }

      res.status(201).json(newChannel);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create channel' });
    }
  }

  async getUserChannels(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const userMemberships = await db.query.channelMembers.findMany({
        where: eq(channelMembers.userId, userId),
        with: {
          channel: true,
        },
      });
      res.json(userMemberships.map((m: any) => m.channel));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch channels' });
    }
  }
}

export const channelController = new ChannelController();
