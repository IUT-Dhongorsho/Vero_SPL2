import { pgTable, uuid, text, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core';

export const visibilityEnum = pgEnum('visibility', ['private', 'public']);
export const editPermEnum = pgEnum('edit_permission', ['read-only', 'editable']);

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: text('module_id').notNull(),       // text — module IDs come from project-service and may not be UUIDs
  creatorId: text('creator_id').notNull(),      // no FK — users live in auth-service's DB, not here
  title: text('title').notNull().default('Untitled Note'),
  contentSnapshot: text('content_snapshot').notNull().default(''),
  yjsState: text('yjs_state'),               // base64-encoded Uint8Array
  visibility: visibilityEnum('visibility').notNull().default('private'),
  editPermission: editPermEnum('edit_permission').notNull().default('editable'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
