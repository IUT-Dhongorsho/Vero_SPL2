import { db } from '../db/client.js';
import { channels, channelMembers } from '../models/channel.model.js';
import { eq, desc, sql } from 'drizzle-orm';
import { channelService } from '../services/channel.service.js';
export class ChannelController {
    async createChannel(req, res) {
        try {
            const { name, type, memberIds } = req.body;
            const userId = req.user.id;
            const newChannel = await channelService.createChannel({
                name,
                type,
                creatorId: userId,
                memberIds
            });
            res.status(201).json(newChannel);
        }
        catch (error) {
            console.error('CreateChannel Error:', error);
            res.status(500).json({ error: error.message || 'Failed to create channel' });
        }
    }
    async getUserChannels(req, res) {
        try {
            const userId = req.user.id;
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
                                orderBy: [desc(sql `created_at`)]
                            }
                        }
                    },
                },
            });
            // Map to return enriched channel objects
            const results = userMemberships.map((m) => {
                const channel = m.channel;
                return {
                    ...channel,
                    lastMessage: channel.messages?.[0] || null,
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
        }
        catch (error) {
            console.error('Failed to fetch channels:', error);
            res.status(500).json({ error: 'Failed to fetch channels' });
        }
    }
    async getChannelById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
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
            const isMember = channel.members.some((m) => m.userId === userId);
            if (!isMember) {
                return res.status(403).json({ error: 'Not a member of this channel' });
            }
            res.json(channel);
        }
        catch (error) {
            console.error('Failed to fetch channel:', error);
            res.status(500).json({ error: 'Failed to fetch channel' });
        }
    }
}
export const channelController = new ChannelController();
