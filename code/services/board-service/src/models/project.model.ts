import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import crypto from 'crypto';
import { workspaces } from './workspace.model.js';

export const projects = pgTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  ownerId: text('owner_id').notNull(), // Better Auth ids are opaque strings, not UUIDs
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
