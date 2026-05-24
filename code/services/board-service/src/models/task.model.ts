import { pgTable, text, timestamp, varchar, uuid, integer } from 'drizzle-orm/pg-core';
import { columns } from './column.model.js';

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  order: integer('order').notNull(),
  columnId: uuid('column_id').references(() => columns.id).notNull(),
  assigneeId: uuid('assignee_id'), // Reverted to uuid
  creatorId: uuid('creator_id').notNull(), // Reverted to uuid
  dueDate: timestamp('due_date'),
  priority: varchar('priority', { length: 20 }).default('medium'), // low, medium, high, urgent
  status: varchar('status', { length: 20 }).default('todo'), // backlog, todo, in_progress, review, done
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
