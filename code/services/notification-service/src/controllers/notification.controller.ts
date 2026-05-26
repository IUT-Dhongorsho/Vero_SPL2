import { Request, Response } from 'express';
import { db } from '../db/client.js';
import { notifications } from '../models/notification.model.js';
import { eq, and, desc, count } from 'drizzle-orm';

export const getNotifications = async (req: Request, res: Response) => {
  const userId = req.query.userId as string; // Ideally from auth middleware
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const list = await db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: [desc(notifications.createdAt)],
      limit: 50,
    });

    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const [result] = await db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    res.json({ count: result.value });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};
