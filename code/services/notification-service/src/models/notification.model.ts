import { pgTable, text, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';
import { sql, and, eq, gte } from 'drizzle-orm';
import { users } from './user.model.js';

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  type: text('type').notNull(),

  entityId: text('entity_id').notNull(),
  entityType: text('entity_type').notNull(),
  groupWindowId: text('group_window_id'),

  actorIds: text('actor_ids').array().notNull().default(sql`'{}'`),
  actorCount: integer('actor_count').notNull().default(1),

  title: text('title').notNull(),
  body: text('body'),

  resourceUrl: text('resource_url'),

  isRead: boolean('is_read').notNull().default(false),
  isGrouped: boolean('is_grouped').notNull().default(false),

  emailSentAt: timestamp('email_sent_at'),
  pushSentAt: timestamp('push_sent_at'),

  scheduledFor: timestamp('scheduled_for'),
  firedAt: timestamp('fired_at'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    groupLookupIndex: index('idx_notifications_group_lookup')
      .on(table.userId, table.type, table.entityId, table.createdAt.desc())
      .where(sql`is_grouped = true`),
  }
});
