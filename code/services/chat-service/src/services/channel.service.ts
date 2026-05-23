import { db } from '../db/client.js';
import { channels, channelMembers } from '../models/channel.model.js';
import { eq, and } from 'drizzle-orm';

export class ChannelService {
  async isMember(channelId: string, userId: string) {
    const membership = await db.query.channelMembers.findFirst({
      where: and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.userId, userId)
      ),
    });
    return !!membership;
  }

  async getMembers(channelId: string) {
    return await db.query.channelMembers.findMany({
      where: eq(channelMembers.channelId, channelId),
    });
  }
}

export const channelService = new ChannelService();
