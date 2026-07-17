import { Request, Response } from 'express';
import { and, eq, isNull, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { meetings, meetingParticipants } from '../models/meeting.model.js';
import { roomService } from '../services/room.service.js';

export const roomController = {
  async getRoomStatus(req: Request, res: Response): Promise<void> {
    const { roomId } = req.params;

    try {
      const activeMeeting = await db.query.meetings.findFirst({
        where: and(eq(meetings.roomId, roomId), isNull(meetings.endedAt)),
        with: {
          startedByUser: true,
          participants: {
            where: isNull(meetingParticipants.leftAt),
            with: { user: true },
          },
        },
        orderBy: [desc(meetings.startedAt)],
      });

      const livePeerCount = roomService.getRoom(roomId)?.peers.size ?? 0;

      if (!activeMeeting) {
        res.json({ roomId, status: 'idle', livePeerCount: 0, meeting: null });
        return;
      }

      res.json({
        roomId,
        status: 'active',
        livePeerCount,
        meeting: {
          id: activeMeeting.id,
          startedAt: activeMeeting.startedAt,
          startedBy: activeMeeting.startedByUser,
          participants: activeMeeting.participants.map((p) => ({
            userId: p.userId,
            user: p.user,
            joinedAt: p.joinedAt,
          })),
        },
      });
    } catch (err) {
      console.error('[Room] getRoomStatus error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getRoomHistory(req: Request, res: Response): Promise<void> {
    const { roomId } = req.params;
    try {
      const history = await db.query.meetings.findMany({
        where: and(eq(meetings.roomId, roomId)),
        orderBy: [desc(meetings.startedAt)],
        limit: 10,
        with: { participants: { with: { user: true } } },
      });
      res.json({ roomId, history });
    } catch (err) {
      console.error('[Room] getRoomHistory error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
