import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  email: text('email').notNull(),
  /** Whether new notifications are also emailed. In-app delivery is always on. */
  emailNotifications: boolean('email_notifications').notNull().default(true),
  syncedAt: timestamp('synced_at').defaultNow(),
});
