import { notify } from '../notify.service.js';
import { inAppLink } from '../../utils/in-app-link.js';

/**
 * Connection requests from the Inbox, and @mentions. Ordinary messages are
 * badged in the Inbox instead of notified.
 */
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
      case 'message.mentioned': {
        // chat-service already narrowed recipients to members of the channel.
        const place = data.channelName ? ` in ${String(data.channelName).replace(/ Chat$/, '')}` : '';
        const who = data.everyone ? 'everyone' : 'you';
        for (const userId of data.recipientIds ?? []) {
          await notify({
            userId,
            type: 'chat.mentioned',
            entityId: data.channelId,
            entityType: 'channel',
            actorId: data.senderId,
            title: `${data.senderName} mentioned ${who}${place}`,
            body: data.preview,
            resourceUrl: inAppLink(data.link) ?? '/inbox',
          });
        }
        break;
      }
    }
  }
}

export const chatHandler = new ChatHandler();
