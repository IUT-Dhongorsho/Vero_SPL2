/**
 * Rebuilds the HTML snapshot of notes whose live document has content but
 * whose saved snapshot is empty — what persisting a live note used to do.
 * Only empty snapshots are touched.
 *
 *   bun run repair:snapshots            (uses DATABASE_URL)
 */
import * as Y from 'yjs';
import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from './client.js';
import { documents } from '../models/document.model.js';
import { ydocToHtml } from '../services/ydoc-html.js';

const rows = await db
  .select({ id: documents.id, title: documents.title, yjsState: documents.yjsState })
  .from(documents)
  .where(and(eq(documents.contentSnapshot, ''), isNotNull(documents.yjsState)));

let repaired = 0;
for (const row of rows) {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, Buffer.from(row.yjsState!, 'base64'));
  const html = ydocToHtml(doc);
  if (!html) continue;
  await db.update(documents).set({ contentSnapshot: html }).where(and(eq(documents.id, row.id), eq(documents.contentSnapshot, '')));
  repaired++;
  console.log(`✔ ${row.title} (${html.length} characters)`);
}

console.log(`Repaired ${repaired} of ${rows.length} notes with an empty snapshot.`);
process.exit(0);
