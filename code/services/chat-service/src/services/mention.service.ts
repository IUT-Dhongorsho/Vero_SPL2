import { channelService } from './channel.service.js';
import { publisherService } from './publisher.service.js';
import { MessagePayload } from '../ws/types.js';

const PREVIEW_LENGTH = 140;

/**
 * Turns the @mentions on a sent message into a `message.mentioned` event for
 * notification-service. The client says who it mentioned; only people who are
 * in the channel (and not the sender) are kept, so a crafted payload cannot
 * notify strangers.
 */
export async function publishMentions(
  payload: MessagePayload,
  message: { id: string; content: string },
  sender: { id: string; name?: string }
) {
  const named = Array.isArray(payload.mentions) ? payload.mentions.filter((id) => typeof id === 'string') : [];
  if (!payload.mentionsAll && named.length === 0) return;

  const channel = await channelService.withMemberIds(payload.channelId);
  if (!channel) return;

  const others = channel.memberIds.filter((id) => id !== sender.id);
  const recipientIds = payload.mentionsAll ? others : others.filter((id) => named.includes(id));
  if (recipientIds.length === 0) return;

  const preview =
    message.content.length > PREVIEW_LENGTH ? `${message.content.slice(0, PREVIEW_LENGTH - 1)}…` : message.content;

  await publisherService.connectionEvent('message.mentioned', {
    recipientIds,
    everyone: Boolean(payload.mentionsAll),
    channelId: payload.channelId,
    channelName: channel.name,
    messageId: message.id,
    senderId: sender.id,
    senderName: sender.name ?? 'Someone',
    preview,
    link: typeof payload.link === 'string' ? payload.link : null,
  });
}
