import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { notifications } from './notification.model.js';

export const notificationDeliveryLog = pgTable('notification_delivery_log', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  notificationId: text('notification_id').notNull()
                    .references(() => notifications.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull(),      // 'socket' | 'email' | 'push'
  status: text('status').notNull(),       // 'sent' | 'failed' | 'skipped'
  failureReason: text('failure_reason'),         // populated on 'failed'
  attemptedAt: timestamp('attempted_at').defaultNow(),
});
