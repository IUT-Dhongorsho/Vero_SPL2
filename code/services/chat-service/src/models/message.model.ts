import { pgTable, uuid, text, timestamp, boolean, varchar, integer } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { channels } from './channel.model.js';
import { users } from './user.model.js';

export const messages = pgTable('messages', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  channelId: text('channel_id').references(() => channels.id).notNull(),
  senderId: text('sender_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  // text | file | image | action (from /me) | system
  type: varchar('type', { length: 20 }).default('text').notNull(),
  attachmentUrl: text('attachment_url'),
  attachmentName: varchar('attachment_name', { length: 512 }),
  attachmentMime: varchar('attachment_mime', { length: 255 }),
  attachmentSize: integer('attachment_size'),
  replyToId: text('reply_to_id'),
  isEdited: boolean('is_edited').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messageReceipts = pgTable('message_receipts', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  messageId: text('message_id').references(() => messages.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'delivered', 'read'
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const messageRelations = relations(messages, ({ one, many }) => ({
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receipts: many(messageReceipts),
}));

export const messageReceiptRelations = relations(messageReceipts, ({ one }) => ({
  message: one(messages, {
    fields: [messageReceipts.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageReceipts.userId],
    references: [users.id],
  }),
}));
