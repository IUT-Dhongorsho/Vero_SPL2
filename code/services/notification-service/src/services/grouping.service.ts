import { db } from '../db/client.js';
import { notifications } from '../models/notification.model.js';
import { and, eq, gte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface GroupingOptions {
  userId: string;
  type: string;
  entityId: string;
  entityType: string;
  actorId: string;
  title: string;
  body?: string;
  resourceUrl?: string;
}

export class GroupingService {
  async process(options: GroupingOptions) {
    const { userId, type, entityId, entityType, actorId, title, body, resourceUrl } = options;

    // 1. Look for an open group (same user, same type, same entity, within last 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const openGroup = await db.query.notifications.findFirst({
      where: and(
        eq(notifications.userId, userId),
        eq(notifications.type, type),
        eq(notifications.entityId, entityId),
        eq(notifications.isGrouped, true),
        gte(notifications.createdAt, twoMinutesAgo)
      ),
      orderBy: (notifications, { desc }) => [desc(notifications.createdAt)]
    });

    if (openGroup) {
      // 2. Update existing group
      // Avoid duplicate actorIds in the array
      const isNewActor = !openGroup.actorIds.includes(actorId);
      
      const [updated] = await db.update(notifications)
        .set({
          actorIds: isNewActor ? sql`array_append(${notifications.actorIds}, ${actorId})` : notifications.actorIds,
          actorCount: isNewActor ? sql`${notifications.actorCount} + 1` : notifications.actorCount,
          updatedAt: new Date(),
          // Note: Title might need re-rendering based on updated actorCount/Ids
          // For now we keep the original title or update it if logic is provided
        })
        .where(eq(notifications.id, openGroup.id))
        .returning();
      
      return { notification: updated, isNew: false };
    } else {
      // 3. Create new notification group
      const [newNotification] = await db.insert(notifications).values({
        userId,
        type,
        entityId,
        entityType,
        actorIds: [actorId],
        actorCount: 1,
        title,
        body,
        resourceUrl,
        isGrouped: true,
        groupWindowId: uuidv4(),
      }).returning();

      return { notification: newNotification, isNew: true };
    }
  }
}

export const groupingService = new GroupingService();
