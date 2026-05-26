import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { groupingService } from '../../src/services/grouping.service.js';
import { db } from '../../src/db/client.js';
import { notifications } from '../../src/models/notification.model.js';
import { users } from '../../src/models/user.model.js';
import { eq } from 'drizzle-orm';

describe('Notification Grouping Logic (FR)', () => {
  const testUserId = 'test-user-grouping';
  const testActorId1 = 'actor-1';
  const testActorId2 = 'actor-2';

  beforeEach(async () => {
    // Ensure test user exists
    await db.insert(users).values({
      id: testUserId,
      name: 'Test User',
      email: 'test@example.com'
    }).onConflictDoNothing();
  });

  afterEach(async () => {
    await db.delete(notifications).where(eq(notifications.userId, testUserId));
  });

  it('should create a new notification if no open group exists', async () => {
    const { notification, isNew } = await groupingService.process({
      userId: testUserId,
      type: 'task.assigned',
      entityId: 'task-123',
      entityType: 'task',
      actorId: testActorId1,
      title: 'New Task Assigned'
    });

    expect(isNew).toBe(true);
    expect(notification.actorCount).toBe(1);
    expect(notification.actorIds).toContain(testActorId1);
  });

  it('should group subsequent notifications within the 2-minute window', async () => {
    // 1. Create first notification
    await groupingService.process({
      userId: testUserId,
      type: 'note.mentioned',
      entityId: 'note-456',
      entityType: 'note',
      actorId: testActorId1,
      title: 'Mentioned in note'
    });

    // 2. Process second mention (same user, type, entity)
    const { notification, isNew } = await groupingService.process({
      userId: testUserId,
      type: 'note.mentioned',
      entityId: 'note-456',
      entityType: 'note',
      actorId: testActorId2,
      title: 'Another mention'
    });

    expect(isNew).toBe(false);
    expect(notification.actorCount).toBe(2);
    expect(notification.actorIds).toContain(testActorId1);
    expect(notification.actorIds).toContain(testActorId2);
  });

  it('should not group notifications if the 2-minute window has passed', async () => {
     // 1. Create first notification
    const { notification: firstNotif } = await groupingService.process({
      userId: testUserId,
      type: 'chat.mentioned',
      entityId: 'channel-789',
      entityType: 'channel',
      actorId: testActorId1,
      title: 'Mentioned in chat'
    });

    // 2. Manually push its createdAt back by 5 minutes in the DB
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await db.update(notifications)
      .set({ createdAt: fiveMinutesAgo })
      .where(eq(notifications.id, firstNotif.id));

    // 3. Process second mention
    const { notification: secondNotif, isNew } = await groupingService.process({
      userId: testUserId,
      type: 'chat.mentioned',
      entityId: 'channel-789',
      entityType: 'channel',
      actorId: testActorId2,
      title: 'Recent mention'
    });

    expect(isNew).toBe(true); // Should start a new group
    expect(secondNotif.id).not.toBe(firstNotif.id);
  });
});
