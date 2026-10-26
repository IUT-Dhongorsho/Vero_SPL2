import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { moduleMembers, modules } from '../models/workspace.model.js';
import { addChatMembers, removeChatMembers } from '../grpc/client.js';

/**
 * Keeps a module's chat channel membership in step with module membership.
 * chat-service owns the channel; this only mirrors who belongs in it. Failures
 * are logged rather than thrown — the module change itself already succeeded,
 * and the next membership change (or provisioning) re-syncs.
 */
export const chatSyncService = {
  async add(moduleId: string, userIds: string[]) {
    const mod = await db.query.modules.findFirst({ where: eq(modules.id, moduleId) });
    if (!mod?.chatResourceId || userIds.length === 0) return;
    try {
      await addChatMembers({ channelId: mod.chatResourceId, userIds });
    } catch (error: any) {
      console.warn(`⚠️ [ChatSync] add to ${mod.chatResourceId} failed:`, error.message);
    }
  },

  async remove(moduleId: string, userIds: string[]) {
    const mod = await db.query.modules.findFirst({ where: eq(modules.id, moduleId) });
    if (!mod?.chatResourceId || userIds.length === 0) return;
    try {
      await removeChatMembers({ channelId: mod.chatResourceId, userIds });
    } catch (error: any) {
      console.warn(`⚠️ [ChatSync] remove from ${mod.chatResourceId} failed:`, error.message);
    }
  },

  /** Adds every current module member — used right after the channel exists. */
  async addAllMembers(moduleId: string) {
    const members = await db.query.moduleMembers.findMany({
      where: eq(moduleMembers.moduleId, moduleId),
      columns: { userId: true },
    });
    await this.add(moduleId, members.map((m) => m.userId));
  },
};
