import { Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db/client.js';
import { schedulerService } from '../services/scheduler.service.js';
import { inAppLink } from '../utils/in-app-link.js';
import { notifications } from '../models/notification.model.js';
import { users } from '../models/user.model.js';
import { pushSubscriptions } from '../models/push-subscription.model.js';
import { eq, and, desc, count, lt } from 'drizzle-orm';
import { env } from '../config/env.js';
import type { AuthedRequest } from '../middleware/auth.js';

/** Every handler below acts only on the signed-in user's own rows. */
export const notificationController = {
  /** GET /notifications?before=<iso>&limit= — newest first. */
  async list(req: AuthedRequest, res: Response) {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
      const before = typeof req.query.before === 'string' ? new Date(req.query.before) : null;

      const list = await db.query.notifications.findMany({
        where:
          before && !isNaN(before.getTime())
            ? and(eq(notifications.userId, req.userId!), lt(notifications.createdAt, before))
            : eq(notifications.userId, req.userId!),
        orderBy: [desc(notifications.createdAt)],
        limit,
      });
      res.json(list);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  },

  async unreadCount(req: AuthedRequest, res: Response) {
    try {
      const [result] = await db
        .select({ value: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, req.userId!), eq(notifications.isRead, false)));
      res.json({ count: result.value });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  },

  async markAsRead(req: AuthedRequest, res: Response) {
    try {
      const updated = await db
        .update(notifications)
        .set({ isRead: true, updatedAt: new Date() })
        .where(and(eq(notifications.id, String(req.params.id)), eq(notifications.userId, req.userId!)))
        .returning({ id: notifications.id });
      if (updated.length === 0) return res.status(404).json({ error: 'Notification not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  },

  async markAllAsRead(req: AuthedRequest, res: Response) {
    try {
      await db
        .update(notifications)
        .set({ isRead: true, updatedAt: new Date() })
        .where(and(eq(notifications.userId, req.userId!), eq(notifications.isRead, false)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  },

  async remove(req: AuthedRequest, res: Response) {
    try {
      const deleted = await db
        .delete(notifications)
        .where(and(eq(notifications.id, String(req.params.id)), eq(notifications.userId, req.userId!)))
        .returning({ id: notifications.id });
      if (deleted.length === 0) return res.status(404).json({ error: 'Notification not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  },

  /** GET /notifications/preferences */
  async preferences(req: AuthedRequest, res: Response) {
    try {
      const user = await db.query.users.findFirst({ where: eq(users.id, req.userId!) });
      const subs = await db.query.pushSubscriptions.findMany({
        where: eq(pushSubscriptions.userId, req.userId!),
        columns: { id: true, deviceLabel: true, platform: true, createdAt: true },
      });
      res.json({
        emailNotifications: user?.emailNotifications ?? true,
        emailAvailable: !!env.SMTP_HOST,
        pushAvailable: !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
        pushPublicKey: env.VAPID_PUBLIC_KEY ?? null,
        pushDevices: subs,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load preferences' });
    }
  },

  /** PATCH /notifications/preferences { emailNotifications } */
  async updatePreferences(req: AuthedRequest, res: Response) {
    const { emailNotifications } = req.body ?? {};
    if (typeof emailNotifications !== 'boolean') {
      return res.status(400).json({ error: 'emailNotifications must be true or false' });
    }
    try {
      const updated = await db
        .update(users)
        .set({ emailNotifications })
        .where(eq(users.id, req.userId!))
        .returning({ emailNotifications: users.emailNotifications });
      if (updated.length === 0) return res.status(404).json({ error: 'Your account has not finished syncing yet' });
      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save preferences' });
    }
  },

  /** POST /notifications/push/subscriptions — a browser's PushSubscription JSON. */
  async subscribePush(req: AuthedRequest, res: Response) {
    const { endpoint, keys, deviceLabel } = req.body ?? {};
    if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'That is not a valid push subscription' });
    }
    try {
      // One row per endpoint: re-subscribing the same browser replaces it.
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
      const [sub] = await db
        .insert(pushSubscriptions)
        .values({
          userId: req.userId!,
          platform: 'web',
          endpoint,
          p256dhKey: String(keys.p256dh),
          authKey: String(keys.auth),
          deviceLabel: typeof deviceLabel === 'string' ? deviceLabel.slice(0, 120) : null,
        })
        .returning({ id: pushSubscriptions.id, deviceLabel: pushSubscriptions.deviceLabel });
      res.status(201).json(sub);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save push subscription' });
    }
  },

  /** DELETE /notifications/push/subscriptions { endpoint } */
  async unsubscribePush(req: AuthedRequest, res: Response) {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== 'string') return res.status(400).json({ error: 'endpoint is required' });
    try {
      await db
        .delete(pushSubscriptions)
        .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, req.userId!)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove push subscription' });
    }
  },

  /**
   * POST /notifications/reminders { text, remindAt, link? } — `/remind` in chat.
   * Notifies the signed-in user at `remindAt`; the notification opens `link`.
   */
  async createReminder(req: AuthedRequest, res: Response) {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const remindAt = new Date(req.body?.remindAt);
    if (!text || text.length > 200) {
      return res.status(400).json({ error: 'Say what to remind you about, in 200 characters or fewer' });
    }
    if (isNaN(remindAt.getTime()) || remindAt.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Pick a time in the future' });
    }
    if (remindAt.getTime() > Date.now() + MAX_REMINDER_AHEAD_MS) {
      return res.status(400).json({ error: 'Reminders can be set up to a year ahead' });
    }

    try {
      const id = randomUUID();
      await schedulerService.schedule({
        type: 'reminder.due',
        entityId: id,
        userId: req.userId!,
        scheduledFor: remindAt,
        data: { text, link: inAppLink(req.body?.link) },
      });
      res.status(201).json({ id, remindAt: remindAt.toISOString() });
    } catch (error) {
      res.status(500).json({ error: 'Failed to set the reminder' });
    }
  },
};

const MAX_REMINDER_AHEAD_MS = 366 * 24 * 60 * 60 * 1000;
