import { db } from '../db/client.js';
import { channels, channelMembers } from '../models/channel.model.js';
import { eq, and } from 'drizzle-orm';

export class ChannelService {
  async isMember(channelId: string, userId: string) {
    console.log(`🔍 [ChannelService] Checking membership: user ${userId} in channel ${channelId}`);
    const membership = await db.query.channelMembers.findFirst({
      where: and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.userId, userId)
      ),
    });
    const result = !!membership;
    console.log(`${result ? '✅' : '❌'} [ChannelService] Membership check result: ${result}`);
    return result;
  }

  async getMembers(channelId: string) {
    return await db.query.channelMembers.findMany({
      where: eq(channelMembers.channelId, channelId),
      with: {
          user: true
      }
    });
  }

  /**
   * Centralized logic to create a channel and its initial members.
   * Handles unique DM logic and transactional integrity.
   */
  async createChannel(data: {
    name?: string | null;
    type: 'direct' | 'group' | 'public';
    creatorId: string;
    memberIds?: string[];
    externalId?: string | null;
    workspaceId?: string | null;
  }) {
    return await db.transaction(async (tx) => {
      // 1. Handle Direct Message Uniqueness
      if (data.type === 'direct') {
        const targetUserId = data.memberIds?.[0];
        if (!targetUserId) throw new Error('Direct message requires a recipient');

        // Check if a direct channel already exists between these two users
        const commonChannels = await tx.query.channelMembers.findMany({
          where: eq(channelMembers.userId, data.creatorId),
          with: {
            channel: {
              with: {
                members: true
              }
            }
          }
        });

        const existingDM = commonChannels.find(m => 
          m.channel.type === 'direct' && 
          m.channel.members.some((mem: any) => mem.userId === targetUserId)
        );

        if (existingDM) {
          console.log(`♻️ [ChannelService] Found existing DM channel: ${existingDM.channelId}`);
          return existingDM.channel;
        }
      }

      // 2. Create the channel
      const [newChannel] = await tx.insert(channels).values({
        name: data.type === 'direct' ? null : data.name,
        type: data.type,
        externalId: data.externalId,
        workspaceId: data.workspaceId,
      }).returning();

      // 3. Add members
      const membersToCreate = [
        {
          channelId: newChannel.id,
          userId: data.creatorId,
          role: 'admin',
        }
      ];

      if (data.memberIds && Array.isArray(data.memberIds)) {
        data.memberIds.forEach(id => {
          if (id !== data.creatorId) {
            membersToCreate.push({
              channelId: newChannel.id,
              userId: id,
              role: 'member',
            });
          }
        });
      }

      await tx.insert(channelMembers).values(membersToCreate);

      console.log(`✨ [ChannelService] Created new ${data.type} channel: ${newChannel.id}`);
      return newChannel;
    });
  }

  async addMembers(channelId: string, userIds: string[]) {
    const memberData = userIds.map((userId: string) => ({
      channelId,
      userId,
      role: 'member',
    }));

    if (memberData.length > 0) {
      await db.insert(channelMembers).values(memberData).onConflictDoNothing();
    }
    
    return { success: true };
  }
}

export const channelService = new ChannelService();
