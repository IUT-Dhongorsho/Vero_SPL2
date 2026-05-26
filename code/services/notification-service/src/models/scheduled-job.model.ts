import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './user.model.js';

export const scheduledJobs = pgTable('scheduled_jobs', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  bullmqJobId: text('bullmq_job_id').notNull().unique(),
  notificationType: text('notification_type').notNull(), // 'meet.reminder' | 'task.due_soon'
  entityId: text('entity_id').notNull(),
  targetUserId: text('target_user_id').notNull()
                    .references(() => users.id, { onDelete: 'cascade' }),
  scheduledFor: timestamp('scheduled_for').notNull(),
  status: text('status').notNull().default('pending'),
                  // 'pending' | 'fired' | 'cancelled'
  createdAt: timestamp('created_at').defaultNow(),
});
