import { pgTable, text, timestamp, varchar, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './user.model.js';

/**
 * A directed connection request between two users. Direct messaging is only
 * unlocked once the addressee accepts, which is what makes "add someone, and if
 * they add you back you can chat" work.
 */
export const connections = pgTable(
  'connections',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    requesterId: text('requester_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    addresseeId: text('addressee_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    // pending | accepted | declined | blocked
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    message: text('message'),
    channelId: text('channel_id'), // set once accepted and the DM channel exists
    createdAt: timestamp('created_at').defaultNow().notNull(),
    respondedAt: timestamp('responded_at'),
  },
  (t) => ({
    pairUnique: uniqueIndex('connections_pair_idx').on(t.requesterId, t.addresseeId),
    addresseeIdx: index('connections_addressee_idx').on(t.addresseeId, t.status),
    requesterIdx: index('connections_requester_idx').on(t.requesterId, t.status),
  })
);

export const connectionRelations = relations(connections, ({ one }) => ({
  requester: one(users, {
    fields: [connections.requesterId],
    references: [users.id],
    relationName: 'connection_requester',
  }),
  addressee: one(users, {
    fields: [connections.addresseeId],
    references: [users.id],
    relationName: 'connection_addressee',
  }),
}));
