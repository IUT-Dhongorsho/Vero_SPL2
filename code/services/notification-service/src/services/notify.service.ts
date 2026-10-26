import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../models/user.model.js';
import { pushSubscriptions } from '../models/push-subscription.model.js';
import { notificationDeliveryLog } from '../models/delivery-log.model.js';
import { groupingService, type GroupingOptions } from './grouping.service.js';
import { socketDelivery } from './delivery/socket.delivery.js';
import { pushDelivery } from './delivery/push.delivery.js';
import { emailDelivery } from './delivery/email.delivery.js';
import { notificationEmail } from './email-templates.js';

export interface NotifyOptions extends GroupingOptions {
  /** Also email it (when the recipient has email notifications on). */
  email?: boolean;
}

async function log(notificationId: string, channel: 'socket' | 'push' | 'email', ok: boolean, reason?: string) {
  await db
    .insert(notificationDeliveryLog)
    .values({ notificationId, channel, status: ok ? 'sent' : 'failed', failureReason: ok ? null : reason ?? null })
    .catch(() => {});
}

/**
 * The one path every notification takes: group with recent ones of the same
 * kind, then deliver in-app (socket), to the user's devices (push) and — for a
 * new group only, so a burst becomes one email — by email.
 */
export async function notify(options: NotifyOptions) {
  const { email, ...grouping } = options;

  const recipient = await db.query.users.findFirst({ where: eq(users.id, grouping.userId) });
  if (!recipient) {
    console.warn(`⚠️ [notify] ${grouping.userId} is not replicated yet — skipping ${grouping.type}`);
    return null;
  }

  const { notification, isNew } = await groupingService.process(grouping);

  const socketOk = await socketDelivery.deliver(recipient.id, {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    resourceUrl: notification.resourceUrl,
    actorCount: notification.actorCount,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  });
  await log(notification.id, 'socket', socketOk, 'socket server not ready');

  const subscriptions = await db.query.pushSubscriptions.findMany({
    where: eq(pushSubscriptions.userId, recipient.id),
  });
  for (const sub of subscriptions) {
    const result = await pushDelivery.deliver(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dhKey, auth: sub.authKey } },
      { title: notification.title, body: notification.body, data: { url: notification.resourceUrl } }
    );
    if (result === 'gone') {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
    }
    await log(notification.id, 'push', result === 'sent', result);
  }

  if (email && isNew && recipient.emailNotifications && recipient.email) {
    const message = notificationEmail(notification.title, notification.body, notification.resourceUrl);
    const ok = await emailDelivery.deliver(recipient.email, message.subject, message.html);
    await log(notification.id, 'email', ok);
  }

  return notification;
}
