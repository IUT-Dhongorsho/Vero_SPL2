import { pgTable, timestamp, varchar, uuid, integer, text } from 'drizzle-orm/pg-core';
import { projects } from './project.model.js';

export const columns = pgTable('columns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  order: integer('order').notNull(),
  projectId: text('project_id').references(() => projects.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
