import { Request, Response } from 'express';
import { db } from '../db/client.js';
import { channels, channelMembers } from '../models/channel.model.js';
import { connections } from '../models/connection.model.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { channelService } from '../services/channel.service.js';
import { connectionService } from '../services/connection.service.js';

export class ChannelController {
  async createChannel(req: Request, res: Response) {
    try {
      const { name, type, memberIds } = req.body;
      const userId = (req as any).user.id;

      const newChannel = await channelService.createChannel({
          name,
          type,
          creatorId: userId,
          memberIds
      });

      res.status(201).json(newChannel);
    } catch (error: any) {
      console.error('CreateChannel Error:', error);
      res.status(500).json({ error: error.message || 'Failed to create channel' });
    }
  }

  /**
   * Opens the direct channel with another user. Requires an accepted
   * connection — you cannot message someone who has not added you back.
   */
  async openDirectChannel(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const targetId = String(req.body?.userId ?? '').trim();
      if (!targetId) return res.status(400).json({ error: 'userId is required' });

      const connection = await connectionService.between(userId, targetId);
      if (connection?.status !== 'accepted') {
        return res.status(403).json({
          error: 'You can only message people you are connected with',
          connectionStatus: connection?.status ?? 'none',
        });
      }

      const channel = await channelService.createChannel({
        type: 'direct',
        creatorId: userId,
        memberIds: [targetId],
      });

      if (connection.channelId !== channel.id) {
        await db.update(connections).set({ channelId: channel.id }).where(eq(connections.id, connection.id));
      }

      res.json(channel);
    } catch (error: any) {
      console.error('OpenDirectChannel Error:', error);
      res.status(500).json({ error: 'Failed to open direct channel' });
    }
  }

  async getUserChannels(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      // Fetch all memberships for the user, and include the channel with members and the LATEST message
      const userMemberships = await db.query.channelMembers.findMany({
        where: eq(channelMembers.userId, userId),
        with: {
          channel: {
            with: {
              members: {
                with: {
                  user: true
                }
              },
              messages: {
                limit: 1,
                orderBy: [desc(sql`created_at`)]
              }
            }
          },
        },
      });

      // Map to return enriched channel objects
      const results = userMemberships.map((m: any) => {
        const channel = m.channel;
        return {
          ...channel,
          lastMessage: (channel as any).messages?.[0] || null,
          messages: undefined
        };
      });

      // Sort by last message activity
      results.sort((a, b) => {
        const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
        const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });

      res.json(results);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      res.status(500).json({ error: 'Failed to fetch channels' });
    }
  }

  /**
   * GET /channels/external/:externalId — the group channel provisioned for a
   * project module. 404 while provisioning is still in flight, 403 for anyone
   * the module has not been shared with.
   */
  async getChannelByExternalId(req: Request, res: Response) {
    try {
      const externalId = String(req.params.externalId);
      const userId = (req as any).user.id;

      const channel = await channelService.findByExternalId(externalId);
      if (!channel) {
        return res.status(404).json({ error: 'This module has no chat yet' });
      }

      const isMember = channel.members.some((m: any) => m.userId === userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Not a member of this channel' });
      }

      res.json({
        ...channel,
        // The provisioning bot is a member for bookkeeping only.
        members: channel.members.filter((m: any) => m.userId !== 'system'),
      });
    } catch (error) {
      console.error('Failed to fetch channel by external id:', error);
      res.status(500).json({ error: 'Failed to fetch channel' });
    }
  }

  async getChannelById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      if (typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid channel ID' });
      }

      // Find channel and include ALL members with their profiles
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, id),
        with: {
          members: {
            with: {
              user: true
            }
          }
        }
      });

      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Verify the requesting user is actually a member of this channel
      const isMember = channel.members.some((m: any) => m.userId === userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Not a member of this channel' });
      }

      res.json(channel);
    } catch (error) {
      console.error('Failed to fetch channel:', error);
      res.status(500).json({ error: 'Failed to fetch channel' });
    }
  }
}

export const channelController = new ChannelController();
