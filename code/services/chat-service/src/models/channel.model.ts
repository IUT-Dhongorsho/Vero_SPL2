import { pgTable, uuid, varchar, timestamp, pgEnum, text } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './user.model.js';

export const channelTypeEnum = pgEnum('channel_type', ['direct', 'group', 'public']);

export const channels = pgTable('channels', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }),
  type: channelTypeEnum('type').notNull().default('direct'),
  externalId: varchar('external_id', { length: 255 }), // Project or Module ID
  workspaceId: text('workspace_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const channelMembers = pgTable('channel_members', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  channelId: text('channel_id').references(() => channels.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(), 
  role: varchar('role', { length: 50 }).default('member').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

import { messages } from './message.model.js';

export const channelRelations = relations(channels, ({ many }) => ({
  members: many(channelMembers),
  messages: many(messages),
}));

export const channelMemberRelations = relations(channelMembers, ({ one }) => ({
  channel: one(channels, {
    fields: [channelMembers.channelId],
    references: [channels.id],
  }),
  user: one(users, {
    fields: [channelMembers.userId],
    references: [users.id],
  }),
}));
