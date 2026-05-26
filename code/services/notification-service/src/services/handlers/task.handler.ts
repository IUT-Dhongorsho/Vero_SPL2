import { groupingService } from '../grouping.service.js';
import { socketDelivery } from '../delivery/socket.delivery.js';
import { emailDelivery } from '../delivery/email.delivery.js';
import { pushDelivery } from '../delivery/push.delivery.js';
import { db } from '../../db/client.js';
import { users } from '../../models/user.model.js';
import { pushSubscriptions } from '../../models/push-subscription.model.js';
import { eq } from 'drizzle-orm';

export class TaskHandler {
  async handle(event: any) {
    const { type, data } = event;
    
    // Example event data structure:
    // { type: 'task.assigned', data: { taskId, taskTitle, assigneeId, assignerId, moduleId, projectId, projectName, moduleName } }

    switch (type) {
      case 'task.assigned':
        await this.handleTaskAssigned(data);
        break;
      // Add other task cases here
    }
  }

  private async handleTaskAssigned(data: any) {
    const { taskId, taskTitle, assigneeId, assignerId, projectId, projectName, moduleName } = data;

    // 1. Process Grouping
    const { notification, isNew } = await groupingService.process({
      userId: assigneeId,
      type: 'task.assigned',
      entityId: taskId,
      entityType: 'task',
      actorId: assignerId,
      title: `${data.assignerName || 'Someone'} assigned you a task`,
      body: taskTitle,
      resourceUrl: `/projects/${projectId}/board`, // Simplified URL
    });

    // 2. Deliver via Socket (Real-time)
    await socketDelivery.deliver(assigneeId, {
      id: notification.id,
      type: 'task.assigned',
      title: notification.title,
      body: notification.body,
      resourceUrl: notification.resourceUrl,
      createdAt: notification.createdAt,
    });

    // 3. Deliver via Push
    const subs = await db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, assigneeId),
    });

    for (const sub of subs) {
      await pushDelivery.deliver({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dhKey,
          auth: sub.authKey,
        }
      }, {
        title: notification.title,
        body: notification.body,
        data: { url: notification.resourceUrl }
      });
    }

    // 4. Deliver via Email (if new notification)
    if (isNew) {
      const recipient = await db.query.users.findFirst({
        where: eq(users.id, assigneeId),
      });

      if (recipient?.email) {
        await emailDelivery.deliver(
          recipient.email,
          `New Task: ${taskTitle}`,
          `<p>Hello ${recipient.name},</p><p>${notification.title} in project <b>${projectName}</b>.</p><p>Task: ${taskTitle}</p>`
        );
      }
    }
  }
}

export const taskHandler = new TaskHandler();
