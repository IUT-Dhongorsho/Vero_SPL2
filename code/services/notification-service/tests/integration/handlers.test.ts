import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq, inArray } from 'drizzle-orm';

const mail = vi.hoisted(() => ({ sent: [] as any[] }));
vi.mock('../../src/services/delivery/email.delivery.js', () => ({
  emailDelivery: {
    deliver: vi.fn(async (to: string, subject: string) => {
      mail.sent.push({ to, subject });
      return true;
    }),
  },
}));
vi.mock('../../src/services/delivery/push.delivery.js', () => ({
  pushDelivery: { deliver: vi.fn(async () => 'gone') },
}));

import { db } from '../../src/db/client.js';
import { users } from '../../src/models/user.model.js';
import { notifications } from '../../src/models/notification.model.js';
import { pushSubscriptions } from '../../src/models/push-subscription.model.js';
import { notificationDeliveryLog } from '../../src/models/delivery-log.model.js';
import { taskHandler } from '../../src/services/handlers/task.handler.js';
import { resourceHandler } from '../../src/services/handlers/resource.handler.js';
import { projectHandler } from '../../src/services/handlers/project.handler.js';
import { chatHandler } from '../../src/services/handlers/chat.handler.js';

const ada = 'handler-ada';
const bob = 'handler-bob';
const cy = 'handler-cy';

const rowsFor = (userId: string) => db.select().from(notifications).where(eq(notifications.userId, userId));

beforeAll(async () => {
  await db.insert(users).values([
    { id: ada, name: 'Ada', email: 'ada@vero.test' },
    { id: bob, name: 'Bob', email: 'bob@vero.test' },
    { id: cy, name: 'Cy', email: 'cy@vero.test', emailNotifications: false },
  ]);
});

afterAll(async () => {
  await db.delete(users).where(inArray(users.id, [ada, bob, cy]));
});

beforeEach(async () => {
  mail.sent.length = 0;
  await db.delete(notifications).where(inArray(notifications.userId, [ada, bob, cy]));
});

describe('task.assigned', () => {
  const event = (assigneeId: string) => ({
    type: 'task.assigned',
    data: {
      taskId: `task-${assigneeId}`,
      taskTitle: 'Write launch notes',
      assigneeId,
      assignerId: ada,
      projectId: 'p1',
      projectName: 'Apollo',
      moduleId: 'm1',
      moduleName: 'Launch',
    },
  });

  it('notifies the assignee with a link that opens the task on its board, and emails them', async () => {
    await taskHandler.handle(event(bob));

    const [row] = await rowsFor(bob);
    expect(row).toMatchObject({
      title: 'Ada assigned you a task',
      body: 'Write launch notes — Apollo · Launch',
      resourceUrl: `/project/p1/module/m1/board?task=task-${bob}`,
    });
    expect(mail.sent).toEqual([{ to: 'bob@vero.test', subject: 'Ada assigned you a task' }]);
  });

  it('respects a recipient who turned email off', async () => {
    await taskHandler.handle(event(cy));
    expect(await rowsFor(cy)).toHaveLength(1);
    expect(mail.sent).toHaveLength(0);
  });

  it('ignores self-assignment', async () => {
    await taskHandler.handle({ ...event(ada), data: { ...event(ada).data, assignerId: ada } });
    expect(await rowsFor(ada)).toHaveLength(0);
  });
});

describe('file.uploaded', () => {
  it('groups a burst of uploads by the same person into one notification', async () => {
    const upload = (names: string[]) =>
      resourceHandler.handle({
        type: 'file.uploaded',
        data: {
          projectId: 'p1',
          projectName: 'Apollo',
          folderId: 'f1',
          fileNames: names,
          uploaderId: ada,
          uploaderName: 'Ada',
          recipientIds: [bob],
        },
      });

    await upload(['spec.pdf']);
    await upload(['a.png', 'b.png']);

    const rows = await rowsFor(bob);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Ada added spec.pdf to Apollo');
    expect(rows[0].resourceUrl).toBe('/project/p1?tab=files&folder=f1');
  });
});

describe('project events', () => {
  it('tells admins when someone joins', async () => {
    await projectHandler.handle({
      type: 'project.member_joined',
      data: { projectId: 'p1', projectName: 'Apollo', userId: bob, userName: 'Bob', adminIds: [ada, bob] },
    });
    expect((await rowsFor(ada))[0].title).toBe('Bob joined Apollo');
    expect(await rowsFor(bob)).toHaveLength(0);
  });

  it('tells people they were added to a module', async () => {
    await projectHandler.handle({
      type: 'module.member_added',
      data: { projectId: 'p1', moduleId: 'm1', moduleName: 'Launch', userIds: [bob], actorId: ada, actorName: 'Ada' },
    });
    const [row] = await rowsFor(bob);
    expect(row.title).toBe('Ada added you to Launch');
    expect(row.resourceUrl).toBe('/project/p1/module/m1');
  });

  it('does not notify someone who left on their own', async () => {
    await projectHandler.handle({
      type: 'project.member_removed',
      data: { projectId: 'p1', projectName: 'Apollo', userId: bob, actorId: bob },
    });
    expect(await rowsFor(bob)).toHaveLength(0);
  });
});

describe('connection events', () => {
  it('notifies the person being asked to connect', async () => {
    await chatHandler.handle({
      type: 'connection.requested',
      data: { connectionId: 'c1', requesterId: ada, requesterName: 'Ada', targetId: bob, message: null },
    });
    expect((await rowsFor(bob))[0].title).toBe('Ada wants to connect');
  });
});

describe('push housekeeping', () => {
  it('removes subscriptions the push service says are gone', async () => {
    await db.insert(pushSubscriptions).values({
      userId: bob,
      platform: 'web',
      endpoint: 'https://push.example.com/stale',
      p256dhKey: 'p',
      authKey: 'a',
    });

    await taskHandler.handle({
      type: 'task.assigned',
      data: { taskId: 'push-task', taskTitle: 'X', assigneeId: bob, assignerId: ada, projectId: 'p1', projectName: 'Apollo' },
    });

    expect(await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, bob))).toHaveLength(0);
    const [row] = await rowsFor(bob);
    const log = await db.select().from(notificationDeliveryLog).where(eq(notificationDeliveryLog.notificationId, row.id));
    expect(log.map((l) => [l.channel, l.status])).toContainEqual(['push', 'failed']);
  });
});
