import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { notifications } from '../../src/models/notification.model.js';
import { users } from '../../src/models/user.model.js';
import { eq } from 'drizzle-orm';

describe('Notification Service API & Flow (FR/NFR)', () => {
  const testUserId = 'api-test-user';

  beforeAll(async () => {
    await db.insert(users).values({
      id: testUserId,
      name: 'API Tester',
      email: 'api@test.com'
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    await db.delete(notifications).where(eq(notifications.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it('should return an empty list initially', async () => {
    const res = await request(app).get(`/api/notifications?userId=${testUserId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('should return unread count', async () => {
    // 1. Manually insert a notification
    await db.insert(notifications).values({
      userId: testUserId,
      type: 'test.notif',
      entityId: '123',
      entityType: 'test',
      title: 'Unread Notif',
      isRead: false
    });

    // 2. Check count
    const res = await request(app).get(`/api/notifications/unread-count?userId=${testUserId}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  it('should mark a notification as read', async () => {
    // 1. Get the notification ID
    const [notif] = await db.select().from(notifications).where(eq(notifications.userId, testUserId));
    
    // 2. Mark as read
    const res = await request(app)
      .patch(`/api/notifications/${notif.id}/read`)
      .send({ userId: testUserId });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // 3. Verify in DB
    const [updated] = await db.select().from(notifications).where(eq(notifications.id, notif.id));
    expect(updated.isRead).toBe(true);
  });

  it('should delete a notification', async () => {
    const [notif] = await db.select().from(notifications).where(eq(notifications.userId, testUserId));

    const res = await request(app)
      .delete(`/api/notifications/${notif.id}`)
      .send({ userId: testUserId });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await db.select().from(notifications).where(eq(notifications.id, notif.id));
    expect(check.length).toBe(0);
  });
});
