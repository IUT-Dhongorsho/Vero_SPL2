import { notify } from '../notify.service.js';

/** Connection requests from the Inbox. Messages themselves are badged in the Inbox. */
export class ChatHandler {
  async handle(event: any) {
    const { type, data } = event ?? {};
    switch (type) {
      case 'connection.requested':
        await notify({
          userId: data.targetId,
          type,
          entityId: data.connectionId,
          entityType: 'connection',
          actorId: data.requesterId,
          title: `${data.requesterName} wants to connect`,
          body: data.message || 'Accept the request to start messaging.',
          resourceUrl: '/inbox',
          email: true,
        });
        break;
      case 'connection.accepted':
        await notify({
          userId: data.requesterId,
          type,
          entityId: data.connectionId,
          entityType: 'connection',
          actorId: data.targetId,
          title: `${data.targetName} accepted your request`,
          body: 'You can message each other now.',
          resourceUrl: `/inbox/${data.connectionId}`,
        });
        break;
    }
  }
}

export const chatHandler = new ChatHandler();
