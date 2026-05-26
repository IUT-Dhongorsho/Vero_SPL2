import { projectHandler } from './handlers/project.handler.js';
import { taskHandler } from './handlers/task.handler.js';
import { chatHandler } from './handlers/chat.handler.js';
import { meetHandler } from './handlers/meet.handler.js';
import { noteHandler } from './handlers/note.handler.js';
import { resourceHandler } from './handlers/resource.handler.js';

export class EventRouter {
  async route(channel: string, event: any) {
    switch (channel) {
      case 'project_events':
        await projectHandler.handle(event);
        break;
      case 'task_events':
        await taskHandler.handle(event);
        break;
      case 'chat_events':
        await chatHandler.handle(event);
        break;
      case 'meet_events':
        await meetHandler.handle(event);
        break;
      case 'note_events':
        await noteHandler.handle(event);
        break;
      case 'resource_events':
        await resourceHandler.handle(event);
        break;
      default:
        console.warn(`⚠️ No handler for channel: ${channel}`);
    }
  }
}

export const eventRouter = new EventRouter();
