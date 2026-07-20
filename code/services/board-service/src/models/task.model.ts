import { pgTable, text, timestamp, varchar, uuid, integer } from 'drizzle-orm/pg-core';
import { columns } from './column.model.js';

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  order: integer('order').notNull(),
  columnId: uuid('column_id').references(() => columns.id, { onDelete: 'cascade' }).notNull(),
  assigneeId: text('assignee_id'),
  creatorId: text('creator_id').notNull(),
  dueDate: timestamp('due_date'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  status: varchar('status', { length: 20 }).default('backlog'),
  labels: text('labels').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
