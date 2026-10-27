import { pgTable, text, timestamp, varchar, uuid, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { columns } from './column.model.js';
import { users } from './user.model.js';

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  order: integer('order').notNull(),
  columnId: uuid('column_id').references(() => columns.id, { onDelete: 'cascade' }).notNull(),
  assigneeId: text('assignee_id'), // Kept for backward compatibility / primary assignee
  creatorId: text('creator_id').notNull(),
  dueDate: timestamp('due_date'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  status: varchar('status', { length: 20 }).default('backlog'),
  labels: text('labels').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Normalized Many-to-Many Junction Table (3NF/BCNF)
export const taskAssignees = pgTable('task_assignees', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
}, (table) => ({
  taskUserIdx: uniqueIndex('task_assignees_task_user_idx').on(table.taskId, table.userId),
}));

export const taskRelations = relations(tasks, ({ many, one }) => ({
  column: one(columns, {
    fields: [tasks.columnId],
    references: [columns.id],
  }),
  assignees: many(taskAssignees),
}));

export const taskAssigneeRelations = relations(taskAssignees, ({ one }) => ({
  task: one(tasks, {
    fields: [taskAssignees.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskAssignees.userId],
    references: [users.id],
  }),
}));
