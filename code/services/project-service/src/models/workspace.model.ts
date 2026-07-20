import { pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './user.model.js';

// ─────────────────────────────────────────────
// Projects (no workspace concept)
// ─────────────────────────────────────────────
export const projects = pgTable('projects', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('active').notNull(), // active | completed
  inviteCode: varchar('invite_code', { length: 20 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projectRelations = relations(projects, ({ many }) => ({
  members: many(projectMembers),
  modules: many(modules),
}));

// ─────────────────────────────────────────────
// Project Members (RBAC: admin | member | viewer)
// ─────────────────────────────────────────────
export const projectMembers = pgTable('project_members', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull().default('member'), // admin | member | viewer
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const projectMemberRelations = relations(projectMembers, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
  moduleMembers: many(moduleMembers),
}));

// ─────────────────────────────────────────────
// Modules (sub-units of a project)
// ─────────────────────────────────────────────
export const modules = pgTable('modules', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).default('general').notNull(),
  status: varchar('status', { length: 50 }).default('on-track').notNull(),

  // Resource IDs provisioned by other microservices
  chatResourceId: text('chat_resource_id'),
  boardResourceId: text('board_resource_id'),
  notesResourceId: text('notes_resource_id'),
  signalingResourceId: text('signaling_resource_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const moduleRelations = relations(modules, ({ one, many }) => ({
  project: one(projects, {
    fields: [modules.projectId],
    references: [projects.id],
  }),
  members: many(moduleMembers),
}));

// ─────────────────────────────────────────────
// Module Members
// Cascades from projectMembers: removing a user from a project
// automatically removes them from all its modules.
// ─────────────────────────────────────────────
export const moduleMembers = pgTable('module_members', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  moduleId: text('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectMemberId: text('project_member_id').notNull().references(() => projectMembers.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const moduleMemberRelations = relations(moduleMembers, ({ one }) => ({
  module: one(modules, {
    fields: [moduleMembers.moduleId],
    references: [modules.id],
  }),
  user: one(users, {
    fields: [moduleMembers.userId],
    references: [users.id],
  }),
  projectMember: one(projectMembers, {
    fields: [moduleMembers.projectMemberId],
    references: [projectMembers.id],
  }),
}));
