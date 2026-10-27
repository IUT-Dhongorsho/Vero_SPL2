import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { users } from '../../models/user.model.js';
import { notify } from '../notify.service.js';
import { socketDelivery } from '../delivery/socket.delivery.js';

export class TaskHandler {
  async handle(event: any) {
    const { type, data } = event ?? {};

    switch (type) {
      case 'task.assigned':
        await this.handleTaskAssigned(data);
        break;
      case 'work.changed':
        // Boards, calendars and work lists reload what they show.
        socketDelivery.signal(data?.recipientIds ?? [], 'work:changed', {
          boardId: data?.boardId ?? null,
          projectId: data?.projectId ?? null,
        });
        break;
    }
  }

  /** data: { taskId, taskTitle, assigneeId, assignerId, projectId, projectName, moduleId, moduleName } */
  private async handleTaskAssigned(data: any) {
    const { taskId, taskTitle, assigneeId, assignerId, projectId, projectName, moduleId, moduleName } = data;
    if (!assigneeId || assigneeId === assignerId) return;

    const assigner = await db.query.users.findFirst({ where: eq(users.id, assignerId) });

    await notify({
      userId: assigneeId,
      type: 'task.assigned',
      entityId: taskId,
      entityType: 'task',
      actorId: assignerId,
      title: `${assigner?.name ?? 'Someone'} assigned you a task`,
      body: `${taskTitle} — ${projectName}${moduleName ? ` · ${moduleName}` : ''}`,
      resourceUrl: moduleId ? `/project/${projectId}/module/${moduleId}/board?task=${taskId}` : `/work?task=${taskId}`,
      email: true,
    });
  }
}

export const taskHandler = new TaskHandler();
