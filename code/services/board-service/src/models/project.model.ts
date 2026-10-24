import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import crypto from 'crypto';
import { workspaces } from './workspace.model.js';

/**
 * Replica of a board's owner. Boards are per module, so `id` is the
 * project-service module id; `parentProjectId/Name` record the project the
 * module belongs to so cross-board views can link back to it.
 */
export const projects = pgTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  ownerId: text('owner_id').notNull(), // Better Auth ids are opaque strings, not UUIDs
  parentProjectId: text('parent_project_id'),
  parentProjectName: varchar('parent_project_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
