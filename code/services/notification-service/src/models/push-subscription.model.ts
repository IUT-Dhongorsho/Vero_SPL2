import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './user.model.js';

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),   // 'web' | 'electron' | 'mobile'
  endpoint: text('endpoint').notNull(),   // Web Push API endpoint URL
  p256dhKey: text('p256dh_key'),           // Web Push encryption key
  authKey: text('auth_key'),             // Web Push auth secret
  deviceLabel: text('device_label'),         // "Chrome on Windows", "Vero Desktop"
  createdAt: timestamp('created_at').defaultNow(),
  lastSeenAt: timestamp('last_seen_at').defaultNow(),
});
