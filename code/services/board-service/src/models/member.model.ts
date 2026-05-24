import { pgTable, text, timestamp, varchar, uuid } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace.model.js';

export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id).notNull(),
  userId: uuid('user_id').notNull(), // Reverted to uuid
  role: varchar('role', { length: 50 }).default('member').notNull(), // owner, admin, member, guest
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});
