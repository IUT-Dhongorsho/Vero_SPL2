import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq, inArray } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { notifications } from '../../src/models/notification.model.js';
import { users } from '../../src/models/user.model.js';
import { pushSubscriptions } from '../../src/models/push-subscription.model.js';
import { fakeAuthService, bearer } from '../helpers.js';

const me = 'notif-api-me';
const other = 'notif-api-other';
let restoreFetch: () => void;

beforeAll(async () => {
  restoreFetch = fakeAuthService();
  await db
    .insert(users)
    .values([
      { id: me, name: 'Me', email: 'me@vero.test' },
      { id: other, name: 'Other', email: 'other@vero.test' },
    ])
    .onConflictDoNothing();
  await db.insert(notifications).values([
    { userId: me, type: 'test', entityId: 'e1', entityType: 'test', title: 'First' },
    { userId: me, type: 'test', entityId: 'e2', entityType: 'test', title: 'Second' },
    { userId: other, type: 'test', entityId: 'e3', entityType: 'test', title: 'Not yours' },
  ]);
});

afterAll(async () => {
  restoreFetch();
  await db.delete(users).where(inArray(users.id, [me, other]));
});

describe('notifications API', () => {
  it('requires a verified session — a userId query is not enough', async () => {
    const res = await request(app).get(`/notifications?userId=${me}`);
    expect(res.status).toBe(401);
  });

  it('lists only the caller’s own notifications', async () => {
    const res = await request(app).get('/notifications').set(bearer(me));
    expect(res.status).toBe(200);
    expect(res.body.map((n: any) => n.title).sort()).toEqual(['First', 'Second']);
  });

  it('counts unread', async () => {
    const res = await request(app).get('/notifications/unread-count').set(bearer(me));
    expect(res.body.count).toBe(2);
  });

  it('cannot mark or delete someone else’s notification', async () => {
    const [theirs] = await db.select().from(notifications).where(eq(notifications.userId, other));
    const read = await request(app).patch(`/notifications/${theirs.id}/read`).set(bearer(me));
    const del = await request(app).delete(`/notifications/${theirs.id}`).set(bearer(me));
    expect(read.status).toBe(404);
    expect(del.status).toBe(404);
    const [still] = await db.select().from(notifications).where(eq(notifications.id, theirs.id));
    expect(still.isRead).toBe(false);
  });

  it('marks one, then all, as read', async () => {
    const list = (await request(app).get('/notifications').set(bearer(me))).body;
    await request(app).patch(`/notifications/${list[0].id}/read`).set(bearer(me)).expect(200);
    expect((await request(app).get('/notifications/unread-count').set(bearer(me))).body.count).toBe(1);

    await request(app).patch('/notifications/read-all').set(bearer(me)).expect(200);
    expect((await request(app).get('/notifications/unread-count').set(bearer(me))).body.count).toBe(0);
  });

  it('saves the email preference', async () => {
    const off = await request(app).patch('/notifications/preferences').set(bearer(me)).send({ emailNotifications: false });
    expect(off.body.emailNotifications).toBe(false);
    const prefs = await request(app).get('/notifications/preferences').set(bearer(me));
    expect(prefs.body.emailNotifications).toBe(false);

    const bad = await request(app).patch('/notifications/preferences').set(bearer(me)).send({ emailNotifications: 'no' });
    expect(bad.status).toBe(400);
  });

  it('stores one push subscription per browser endpoint', async () => {
    const sub = { endpoint: 'https://push.example.com/abc', keys: { p256dh: 'p', auth: 'a' }, deviceLabel: 'Chrome' };
    await request(app).post('/notifications/push/subscriptions').set(bearer(me)).send(sub).expect(201);
    await request(app).post('/notifications/push/subscriptions').set(bearer(me)).send(sub).expect(201);
    const rows = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, me));
    expect(rows).toHaveLength(1);

    const insecure = await request(app)
      .post('/notifications/push/subscriptions')
      .set(bearer(me))
      .send({ ...sub, endpoint: 'http://push.example.com/x' });
    expect(insecure.status).toBe(400);

    await request(app).delete('/notifications/push/subscriptions').set(bearer(me)).send({ endpoint: sub.endpoint }).expect(200);
    expect(await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, me))).toHaveLength(0);
  });
});
