import { pgTable, text, timestamp, varchar, uuid } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace.model.js';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  workspaceId: uuid('workspace_id').references(() => workspaces.id).notNull(),
  ownerId: uuid('owner_id').notNull(), // Reverted to uuid
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
