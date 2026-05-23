import { db } from '../db/client.js';
import { channels, channelMembers } from '../models/channel.model.js';
import { eq } from 'drizzle-orm';
export class ChannelController {
    async createChannel(req, res) {
        try {
            const { name, type, memberIds } = req.body;
            const userId = req.user.id;
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
                const otherMembers = memberIds.map((id) => ({
                    channelId: newChannel.id,
                    userId: id,
                    role: 'member',
                }));
                if (otherMembers.length > 0) {
                    await db.insert(channelMembers).values(otherMembers);
                }
            }
            res.status(201).json(newChannel);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create channel' });
        }
    }
    async getUserChannels(req, res) {
        try {
            const userId = req.user.id;
            const userMemberships = await db.query.channelMembers.findMany({
                where: eq(channelMembers.userId, userId),
                with: {
                    channel: true,
                },
            });
            res.json(userMemberships.map((m) => m.channel));
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch channels' });
        }
    }
}
export const channelController = new ChannelController();
