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
