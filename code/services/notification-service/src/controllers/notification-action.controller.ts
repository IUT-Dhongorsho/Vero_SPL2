import { Request, Response } from 'express';
import { db } from '../db/client.js';
import { notifications } from '../models/notification.model.js';
import { eq, and } from 'drizzle-orm';

export const markAsRead = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.body.userId as string; // Ideally from auth middleware

  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  const userId = req.body.userId as string;

  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.body.userId as string;

  try {
    await db.delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};
