import { pgTable, uuid, timestamp, customType } from 'drizzle-orm/pg-core';
import { documents } from './document.model.js';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const yjsUpdates = pgTable('yjs_updates', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  update: bytea('update').notNull(),          // raw Yjs binary update chunk
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

