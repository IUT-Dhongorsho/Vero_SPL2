import { pgTable, text, varchar, timestamp, bigint, index, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { projects } from './workspace.model.js';
import { users } from './user.model.js';

// ─────────────────────────────────────────────
// Project file library
// Folders nest through parentId; a null parent is the project root. Deleting a
// folder cascades to everything beneath it, and the controller removes the
// stored bytes for the files it is about to lose.
// ─────────────────────────────────────────────
export const projectFolders = pgTable('project_folders', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  parentId: text('parent_id').references((): AnyPgColumn => projectFolders.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectParentIdx: index('idx_project_folders_parent').on(table.projectId, table.parentId),
}));

export const projectFiles = pgTable('project_files', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  folderId: text('folder_id').references(() => projectFolders.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  /** Randomised on-disk name — never derived from user input. */
  storedName: varchar('stored_name', { length: 255 }).notNull().unique(),
  mime: varchar('mime', { length: 255 }).notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  uploadedBy: text('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectFolderIdx: index('idx_project_files_folder').on(table.projectId, table.folderId),
}));

export const projectFolderRelations = relations(projectFolders, ({ one }) => ({
  project: one(projects, { fields: [projectFolders.projectId], references: [projects.id] }),
}));

export const projectFileRelations = relations(projectFiles, ({ one }) => ({
  project: one(projects, { fields: [projectFiles.projectId], references: [projects.id] }),
  folder: one(projectFolders, { fields: [projectFiles.folderId], references: [projectFolders.id] }),
  uploader: one(users, { fields: [projectFiles.uploadedBy], references: [users.id] }),
}));
