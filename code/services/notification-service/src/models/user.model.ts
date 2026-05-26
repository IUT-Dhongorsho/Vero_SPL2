import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  email: text('email').notNull(),
  syncedAt: timestamp('synced_at').defaultNow(),
});
