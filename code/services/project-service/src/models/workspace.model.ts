import { pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './user.model.js';

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workspaceRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  projects: many(projects),
}));

export const projects = pgTable('projects', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projectRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  members: many(projectMembers),
  modules: many(modules),
}));

export const projectMembers = pgTable('project_members', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull().default('member'), // admin, member, viewer
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const projectMemberRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

export const modules = pgTable('modules', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  
  // Resource IDs from other microservices
  chatResourceId: text('chat_resource_id'),
  boardResourceId: text('board_resource_id'),
  notesResourceId: text('notes_resource_id'),
  signalingResourceId: text('signaling_resource_id'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const moduleRelations = relations(modules, ({ one }) => ({
  project: one(projects, {
    fields: [modules.projectId],
    references: [projects.id],
  }),
}));
