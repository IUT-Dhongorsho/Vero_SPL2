import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { connections } from '../models/connection.model.js';
import { users } from '../models/user.model.js';
import { channelService } from './channel.service.js';
import { env } from '../config/env.js';

export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

/**
 * The chat DB only holds a thin replica of users, populated from `user_events`.
 * If someone was created before this service was running, pull them on demand so
 * a connection request never fails on a missing foreign key.
 */
export async function ensureUserReplicated(userId: string, authHeaders: Record<string, string>) {
  const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (existing) return existing;

  try {
    const response = await fetch(`${env.AUTH_SERVICE_URL}/users/bulk?ids=${encodeURIComponent(userId)}`, {
      headers: authHeaders,
    });
    if (!response.ok) return null;

    const [profile] = (await response.json()) as { id: string; name: string; image?: string }[];
    if (!profile) return null;

    const [inserted] = await db
      .insert(users)
      .values({ id: profile.id, name: profile.name, avatarUrl: profile.image ?? null })
      .onConflictDoUpdate({ target: users.id, set: { name: profile.name, updatedAt: new Date() } })
      .returning();

    return inserted;
  } catch (error) {
    console.error('[connections] failed to replicate user', userId, error);
    return null;
  }
}

export const connectionService = {
  /** The row describing the relationship between two users, in either direction. */
  async between(userA: string, userB: string) {
    const [row] = await db
      .select()
      .from(connections)
      .where(
        or(
          and(eq(connections.requesterId, userA), eq(connections.addresseeId, userB)),
          and(eq(connections.requesterId, userB), eq(connections.addresseeId, userA))
        )
      )
      .limit(1);
    return row ?? null;
  },

  async areConnected(userA: string, userB: string) {
    const row = await this.between(userA, userB);
    return row?.status === 'accepted';
  },

  /**
   * Sends a request. If the other person already requested *you*, this is read
   * as "adding them back" and the connection is accepted immediately.
   */
  async request(requesterId: string, addresseeId: string, message?: string) {
    if (requesterId === addresseeId) {
      throw Object.assign(new Error('You cannot connect with yourself'), { status: 400 });
    }

    const existing = await this.between(requesterId, addresseeId);

    if (existing) {
      if (existing.status === 'accepted') {
        return { connection: existing, created: false, autoAccepted: false };
      }
      if (existing.status === 'blocked') {
        throw Object.assign(new Error('This connection is blocked'), { status: 403 });
      }
      // They asked first — accepting closes the loop.
      if (existing.addresseeId === requesterId) {
        const accepted = await this.accept(existing.id, requesterId);
        return { connection: accepted, created: false, autoAccepted: true };
      }
      if (existing.status === 'declined') {
        const [reopened] = await db
          .update(connections)
          .set({ status: 'pending', message: message ?? null, createdAt: new Date(), respondedAt: null })
          .where(eq(connections.id, existing.id))
          .returning();
        return { connection: reopened, created: true, autoAccepted: false };
      }
      return { connection: existing, created: false, autoAccepted: false };
    }

    const [created] = await db
      .insert(connections)
      .values({ requesterId, addresseeId, message: message ?? null, status: 'pending' })
      .returning();

    return { connection: created, created: true, autoAccepted: false };
  },

  /** Accepting creates (or reuses) the direct channel the two will talk in. */
  async accept(connectionId: string, actingUserId: string) {
    const [row] = await db.select().from(connections).where(eq(connections.id, connectionId)).limit(1);
    if (!row) throw Object.assign(new Error('Connection not found'), { status: 404 });
    if (row.addresseeId !== actingUserId) {
      throw Object.assign(new Error('Only the recipient can accept this request'), { status: 403 });
    }

    const channel = await channelService.createChannel({
      type: 'direct',
      creatorId: row.requesterId,
      memberIds: [row.addresseeId],
    });

    const [updated] = await db
      .update(connections)
      .set({ status: 'accepted', respondedAt: new Date(), channelId: channel.id })
      .where(eq(connections.id, connectionId))
      .returning();

    return updated;
  },

  async decline(connectionId: string, actingUserId: string) {
    const [row] = await db.select().from(connections).where(eq(connections.id, connectionId)).limit(1);
    if (!row) throw Object.assign(new Error('Connection not found'), { status: 404 });
    if (row.addresseeId !== actingUserId) {
      throw Object.assign(new Error('Only the recipient can decline this request'), { status: 403 });
    }

    const [updated] = await db
      .update(connections)
      .set({ status: 'declined', respondedAt: new Date() })
      .where(eq(connections.id, connectionId))
      .returning();

    return updated;
  },

  async remove(connectionId: string, actingUserId: string) {
    const [row] = await db.select().from(connections).where(eq(connections.id, connectionId)).limit(1);
    if (!row) throw Object.assign(new Error('Connection not found'), { status: 404 });
    if (row.requesterId !== actingUserId && row.addresseeId !== actingUserId) {
      throw Object.assign(new Error('Not your connection'), { status: 403 });
    }

    await db.delete(connections).where(eq(connections.id, connectionId));
    return row;
  },

  /** All connections touching this user, grouped for the Inbox sidebar. */
  async listFor(userId: string) {
    const rows = await db
      .select()
      .from(connections)
      .where(or(eq(connections.requesterId, userId), eq(connections.addresseeId, userId)))
      .orderBy(desc(connections.createdAt));

    const otherIds = rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
    const profiles = otherIds.length
      ? await db.select().from(users).where(inArray(users.id, otherIds))
      : [];
    const profileById = new Map(profiles.map((p) => [p.id, p]));

    const decorate = (row: (typeof rows)[number]) => {
      const otherId = row.requesterId === userId ? row.addresseeId : row.requesterId;
      const profile = profileById.get(otherId);
      return {
        id: row.id,
        status: row.status as ConnectionStatus,
        channelId: row.channelId,
        message: row.message,
        createdAt: row.createdAt,
        respondedAt: row.respondedAt,
        direction: row.requesterId === userId ? ('outgoing' as const) : ('incoming' as const),
        user: {
          id: otherId,
          name: profile?.name ?? 'Unknown user',
          avatarUrl: profile?.avatarUrl ?? null,
        },
      };
    };

    const all = rows.map(decorate);
    return {
      accepted: all.filter((c) => c.status === 'accepted'),
      incoming: all.filter((c) => c.status === 'pending' && c.direction === 'incoming'),
      outgoing: all.filter((c) => c.status === 'pending' && c.direction === 'outgoing'),
    };
  },
};
