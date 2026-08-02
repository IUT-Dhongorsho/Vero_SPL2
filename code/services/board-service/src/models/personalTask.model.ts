import { pgTable, text, timestamp, varchar, uuid, integer, boolean, index } from 'drizzle-orm/pg-core';

/**
 * Tasks a user creates for themselves. Unlike `tasks` these are not attached to
 * a project column — they live only on the owner's Tasks page and Calendar.
 */
export const personalTasks = pgTable(
  'personal_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').default(''),
    // Mirrors the project board vocabulary so both can share one Progress view.
    status: varchar('status', { length: 20 }).default('backlog').notNull(),
    priority: varchar('priority', { length: 20 }).default('medium').notNull(),
    dueDate: timestamp('due_date'),
    labels: text('labels').default(''),
    order: integer('order').default(0).notNull(),
    completedAt: timestamp('completed_at'),
    pinned: boolean('pinned').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('personal_tasks_user_idx').on(t.userId),
    dueIdx: index('personal_tasks_due_idx').on(t.userId, t.dueDate),
  })
);
