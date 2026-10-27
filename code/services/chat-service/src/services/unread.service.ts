import { sql, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { channels } from '../models/channel.model.js';

/**
 * Unread is "sent by someone else, with no read receipt from me". Nothing was
 * marked read before this existed, so only recent messages count — older
 * history would otherwise all show as unread on day one.
 */
const WINDOW = sql`now() - interval '14 days'`;
const MAX_CONVERSATIONS = 20;

const unreadFor = (userId: string) => sql`
  m.sender_id <> ${userId}
  AND m.deleted_at IS NULL
  AND m.created_at > ${WINDOW}
  AND NOT EXISTS (
    SELECT 1 FROM message_receipts r
    WHERE r.message_id = m.id AND r.user_id = ${userId} AND r.status = 'read'
  )`;

export const unreadService = {
  /** Marks everything in a channel read for this person. */
  async markRead(channelId: string, userId: string) {
    await db.execute(sql`
      INSERT INTO message_receipts (message_id, user_id, status)
      SELECT m.id, ${userId}, 'read' FROM messages m
      WHERE m.channel_id = ${channelId} AND ${unreadFor(userId)}`);
  },

  /** Conversations with unread messages, newest first, each with its latest unread message. */
  async summary(userId: string) {
    const { rows } = await db.execute<{
      channel_id: string;
      unread: number;
      message_id: string;
      content: string;
      type: string;
      created_at: string;
      sender_id: string;
      sender_name: string | null;
      sender_avatar: string | null;
    }>(sql`
      WITH unread AS (
        SELECT m.*, count(*) OVER (PARTITION BY m.channel_id)::int AS unread,
               row_number() OVER (PARTITION BY m.channel_id ORDER BY m.created_at DESC) AS rank
        FROM messages m
        JOIN channel_members cm ON cm.channel_id = m.channel_id AND cm.user_id = ${userId}
        WHERE ${unreadFor(userId)}
      )
      SELECT u.channel_id, u.unread, u.id AS message_id, u.content, u.type, u.created_at,
             u.sender_id, s.name AS sender_name, s.avatar_url AS sender_avatar
      FROM unread u LEFT JOIN users s ON s.id = u.sender_id
      WHERE u.rank = 1
      ORDER BY u.created_at DESC
      LIMIT ${MAX_CONVERSATIONS}`);

    if (!rows.length) return { total: 0, conversations: [] };

    const found = await db.query.channels.findMany({
      where: inArray(
        channels.id,
        rows.map((r) => r.channel_id)
      ),
      with: { members: { with: { user: true } } },
    });
    const byId = new Map(found.map((c: any) => [c.id, c]));

    const conversations = rows.map((row) => {
      const channel: any = byId.get(row.channel_id);
      const peer =
        channel?.type === 'direct'
          ? channel.members.find((m: any) => m.userId !== userId && m.userId !== 'system')?.user
          : null;
      return {
        channelId: row.channel_id,
        type: channel?.type ?? 'group',
        name: channel?.name ?? null,
        externalId: channel?.externalId ?? null,
        peer: peer ? { id: peer.id, name: peer.name, avatarUrl: peer.avatarUrl ?? null } : null,
        unread: row.unread,
        latest: {
          id: row.message_id,
          content: row.content,
          type: row.type,
          createdAt: new Date(row.created_at).toISOString(),
          sender: { id: row.sender_id, name: row.sender_name ?? 'Someone', avatarUrl: row.sender_avatar },
        },
      };
    });

    return { total: conversations.reduce((sum, c) => sum + c.unread, 0), conversations };
  },
};
