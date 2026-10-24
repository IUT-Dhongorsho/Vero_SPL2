import { REDIS_CHANNELS } from '@repo/shared';
import { projectHandler } from './handlers/project.handler.js';
import { taskHandler } from './handlers/task.handler.js';
import { chatHandler } from './handlers/chat.handler.js';
import { meetHandler } from './handlers/meet.handler.js';
import { noteHandler } from './handlers/note.handler.js';
import { resourceHandler } from './handlers/resource.handler.js';
import { mailHandler } from './handlers/mail.handler.js';

export class EventRouter {
  async route(channel: string, event: any) {
    switch (channel) {
      case REDIS_CHANNELS.PROJECT_EVENTS:
        await projectHandler.handle(event);
        break;
      case REDIS_CHANNELS.TASK_EVENTS:
        await taskHandler.handle(event);
        break;
      case REDIS_CHANNELS.CHAT_EVENTS:
        await chatHandler.handle(event);
        break;
      case REDIS_CHANNELS.MEET_EVENTS:
        await meetHandler.handle(event);
        break;
      case REDIS_CHANNELS.NOTE_EVENTS:
        await noteHandler.handle(event);
        break;
      case REDIS_CHANNELS.RESOURCE_EVENTS:
        await resourceHandler.handle(event);
        break;
      case REDIS_CHANNELS.MAIL_EVENTS:
        await mailHandler.handle(event);
        break;
      default:
        console.warn(`⚠️ No handler for channel: ${channel}`);
    }
  }
}

export const eventRouter = new EventRouter();
