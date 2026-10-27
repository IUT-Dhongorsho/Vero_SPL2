import { Redis } from 'ioredis';
import { REDIS_CHANNELS } from '@repo/shared';
import { env } from '../config/env.js';

const pubClient = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });

export interface TaskAssignedEvent {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
  assignerId: string;
  projectId: string;
  projectName: string;
  moduleId: string;
  moduleName: string;
}

/** Task events for notification-service. Never fails the request that caused it. */
export const publisherService = {
  /**
   * Something on a board or a personal list changed. notification-service
   * passes it to these people's open apps, which reload what they show; the
   * event says where, never what, so it reveals nothing they could not see.
   */
  async workChanged(data: { recipientIds: string[]; boardId: string | null; projectId: string | null }) {
    if (!data.recipientIds.length) return;
    try {
      if (pubClient.status === 'wait') await pubClient.connect();
      await pubClient.publish(
        REDIS_CHANNELS.TASK_EVENTS,
        JSON.stringify({ type: 'work.changed', data, timestamp: new Date().toISOString() })
      );
    } catch (error: any) {
      console.error('❌ [board-service:publisher] work.changed failed:', error.message);
    }
  },

  async taskAssigned(data: TaskAssignedEvent) {
    try {
      if (pubClient.status === 'wait') await pubClient.connect();
      await pubClient.publish(
        REDIS_CHANNELS.TASK_EVENTS,
        JSON.stringify({ type: 'task.assigned', data, timestamp: new Date().toISOString() })
      );
    } catch (error: any) {
      console.error('❌ [board-service:publisher] task.assigned failed:', error.message);
    }
  },
};
