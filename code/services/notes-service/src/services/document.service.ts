import { db } from '../db/client.js';
import { documents } from '../models/document.model.js';
import { eq, and, desc, inArray, or, ilike } from 'drizzle-orm';
import * as Y from 'yjs';
import { accessService, NotesError, type ModuleRole } from './access.service.js';
import { htmlToText, markdownToYdoc, ydocToHtml } from './ydoc-html.js';
import { markdownToElements } from './markdown.js';
import { editLiveDoc, liveDoc, liveState } from './live-docs.js';
import { publishNoteEvent } from './publisher.service.js';
import { users } from '../models/user.model.js';

export type NoteVisibility = 'private' | 'public';
export type NoteEditPermission = 'read-only' | 'editable';

export interface CreateNoteDTO {
  moduleId: string;
  title?: string;
  visibility: NoteVisibility;
  editPermission: NoteEditPermission;
}

export interface UpdateNoteMetaDTO {
  title?: string;
  visibility?: NoteVisibility;
  editPermission?: NoteEditPermission;
}

type DocumentRow = typeof documents.$inferSelect;

const VISIBILITIES = new Set(['private', 'public']);
const EDIT_PERMISSIONS = new Set(['read-only', 'editable']);

/**
 * Who may do what with a note:
 * - reading needs access to its module, and the note must be yours or public;
 * - editing the body needs a non-viewer role, and the note must be yours or
 *   public-and-editable;
 * - renaming needs edit rights, like the body;
 * - sharing and deletion belong to its creator (admins may delete).
 */
export const permissions = {
  canRead(doc: DocumentRow, userId: string, role: ModuleRole | null) {
    return !!role && (doc.creatorId === userId || doc.visibility === 'public');
  },
  canEdit(doc: DocumentRow, userId: string, role: ModuleRole | null) {
    if (!role || role === 'viewer') return false;
    return doc.creatorId === userId || (doc.visibility === 'public' && doc.editPermission === 'editable');
  },
  canManage(doc: DocumentRow, userId: string, role: ModuleRole | null) {
    return !!role && role !== 'viewer' && doc.creatorId === userId;
  },
  canDelete(doc: DocumentRow, userId: string, role: ModuleRole | null) {
    return this.canManage(doc, userId, role) || role === 'admin';
  },
};

function present(doc: DocumentRow, userId: string, role: ModuleRole | null) {
  const { yjsState: _state, ...rest } = doc;
  return {
    ...rest,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    canEdit: permissions.canEdit(doc, userId, role),
    canManage: permissions.canManage(doc, userId, role),
  };
}

export const documentService = {
  async list(moduleId: string, requesterId: string, authorization: string) {
    const role = await accessService.requireModule(authorization, moduleId);

    const docs = await db.query.documents.findMany({
      where: and(eq(documents.moduleId, moduleId), eq(documents.isDeleted, false)),
      orderBy: (documents, { desc }) => [desc(documents.updatedAt)],
    });

    return docs
      .filter((doc) => permissions.canRead(doc, requesterId, role))
      .map((doc) => {
        const { contentSnapshot, ...rest } = present(doc, requesterId, role);
        return { ...rest, previewText: htmlToText(contentSnapshot).slice(0, 160) };
      });
  },

  async getRawById(id: string) {
    return await db.query.documents.findFirst({
      where: and(eq(documents.id, id), eq(documents.isDeleted, false)),
    });
  },

  /** Loads a note and the caller's role in its module; 404s anything they cannot read. */
  async load(id: string, requesterId: string, authorization: string) {
    const doc = await this.getRawById(id);
    if (!doc) throw new NotesError(404, 'Note not found', 'NOT_FOUND');
    const role = await accessService.moduleRole(authorization, doc.moduleId);
    if (!permissions.canRead(doc, requesterId, role)) throw new NotesError(404, 'Note not found', 'NOT_FOUND');
    return { doc, role };
  },

  async getById(id: string, requesterId: string, authorization: string) {
    const { doc, role } = await this.load(id, requesterId, authorization);
    return present(doc, requesterId, role);
  },

  async create(dto: CreateNoteDTO, creatorId: string, authorization?: string) {
    let role: ModuleRole | null = 'admin';
    if (authorization) {
      role = await accessService.requireModule(authorization, dto.moduleId, true);
    }

    const title = typeof dto.title === 'string' && dto.title.trim() ? dto.title.trim().slice(0, 200) : 'Untitled note';
    const visibility = VISIBILITIES.has(dto.visibility) ? dto.visibility : 'private';
    const editPermission = EDIT_PERMISSIONS.has(dto.editPermission) ? dto.editPermission : 'editable';

    const [doc] = await db
      .insert(documents)
      .values({ moduleId: dto.moduleId, creatorId, title, visibility, editPermission })
      .returning();

    return present(doc, creatorId, role);
  },

  async updateMeta(id: string, dto: UpdateNoteMetaDTO, requesterId: string, authorization: string) {
    const { doc, role } = await this.load(id, requesterId, authorization);
    const sharing = dto.visibility !== undefined || dto.editPermission !== undefined;
    if (sharing && !permissions.canManage(doc, requesterId, role)) {
      throw new NotesError(403, 'Only the author can change who sees this note', 'FORBIDDEN');
    }
    if (dto.title !== undefined && !permissions.canEdit(doc, requesterId, role)) {
      throw new NotesError(403, 'You can read this note but not rename it', 'FORBIDDEN');
    }

    const patch: Partial<DocumentRow> = { updatedAt: new Date() };
    if (dto.title !== undefined) patch.title = String(dto.title).trim().slice(0, 200) || 'Untitled note';
    if (dto.visibility !== undefined) {
      if (!VISIBILITIES.has(dto.visibility)) throw new NotesError(400, 'Unknown visibility', 'VALIDATION_FAILED');
      patch.visibility = dto.visibility;
    }
    if (dto.editPermission !== undefined) {
      if (!EDIT_PERMISSIONS.has(dto.editPermission)) throw new NotesError(400, 'Unknown edit permission', 'VALIDATION_FAILED');
      patch.editPermission = dto.editPermission;
    }

    const [updated] = await db.update(documents).set(patch).where(eq(documents.id, id)).returning();
    return present(updated, requesterId, role);
  },

  async updateContent(id: string, content: string, requesterId: string, authorization: string) {
    const { doc, role } = await this.load(id, requesterId, authorization);
    if (!permissions.canEdit(doc, requesterId, role)) {
      throw new NotesError(403, 'You can read this note but not edit it', 'FORBIDDEN');
    }
    if (typeof content !== 'string') throw new NotesError(400, 'content must be a string', 'VALIDATION_FAILED');
    if (content.length > 2_000_000) throw new NotesError(413, 'This note is too large to save', 'VALIDATION_FAILED');

    const [updated] = await db
      .update(documents)
      .set({ contentSnapshot: content, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return present(updated, requesterId, role);
  },

  async delete(id: string, requesterId: string, authorization: string) {
    const { doc, role } = await this.load(id, requesterId, authorization);
    if (!permissions.canDelete(doc, requesterId, role)) {
      throw new NotesError(403, 'Only the author or a project admin can delete this note', 'FORBIDDEN');
    }

    await db.update(documents).set({ isDeleted: true, updatedAt: new Date() }).where(eq(documents.id, id));
  },

  /**
   * Notifies people @mentioned in a note. Only members of the note's module
   * who can read it are notified — a private note can only be read by its
   * author, so mentions there reach no one.
   */
  async mention(id: string, userIds: unknown, requesterId: string, authorization: string) {
    const { doc, role } = await this.load(id, requesterId, authorization);
    if (!permissions.canEdit(doc, requesterId, role)) {
      throw new NotesError(403, 'You can read this note but not edit it', 'FORBIDDEN');
    }
    const wanted = Array.isArray(userIds) ? [...new Set(userIds.filter((u): u is string => typeof u === 'string'))] : [];
    if (!wanted.length || doc.visibility !== 'public') return { notified: 0 };

    const module = await accessService.moduleDetail(authorization, doc.moduleId);
    const members = new Set(module?.members.map((m) => m.userId) ?? []);
    const recipientIds = wanted.filter((userId) => userId !== requesterId && members.has(userId)).slice(0, 50);
    if (!recipientIds.length) return { notified: 0 };

    const sender = await db.query.users.findFirst({ where: eq(users.id, requesterId) });
    await publishNoteEvent('note.mentioned', {
      recipientIds,
      noteId: doc.id,
      noteTitle: doc.title,
      senderId: requesterId,
      senderName: sender?.name ?? 'Someone',
      link: `/project/${module!.projectId}/module/${doc.moduleId}/notes?note=${doc.id}`,
    });
    return { notified: recipientIds.length };
  },

  async saveYjsState(id: string, state: Uint8Array, snapshotHtml: string) {
    await db
      .update(documents)
      .set({
        yjsState: Buffer.from(state).toString('base64'),
        contentSnapshot: snapshotHtml,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id));
  },

  /**
   * Changes a note's content from the server (meeting transcripts and minutes).
   * When people have the note open, the edit goes into their live document so
   * they see it at once — and so their session does not later save over it.
   */
  async editContent(id: string, edit: (doc: Y.Doc) => void) {
    const doc = await this.getRawById(id);
    if (!doc) throw new NotesError(404, 'Note not found', 'NOT_FOUND');

    let state: Uint8Array;
    let html: string;
    const live = liveDoc(id);
    if (live) {
      editLiveDoc(live, edit);
      state = liveState(live);
      html = ydocToHtml(live);
    } else {
      const ydoc = new Y.Doc();
      if (doc.yjsState) {
        Y.applyUpdate(ydoc, Buffer.from(doc.yjsState, 'base64'));
      } else if (doc.contentSnapshot?.trim()) {
        // The snapshot is editor HTML; keep its words rather than its markup.
        markdownToYdoc(/^\s*</.test(doc.contentSnapshot) ? htmlToText(doc.contentSnapshot) : doc.contentSnapshot, ydoc);
      }
      edit(ydoc);
      state = Y.encodeStateAsUpdate(ydoc);
      html = ydocToHtml(ydoc);
    }

    const [updated] = await db
      .update(documents)
      .set({ yjsState: Buffer.from(state).toString('base64'), contentSnapshot: html, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return updated;
  },

  async appendTranscript(id: string, text: string) {
    return this.editContent(id, (ydoc) => markdownToYdoc(text, ydoc));
  },

  /** Puts the minutes at the top, with the transcript below them. */
  async finalizeMeetingMinutes(id: string, minutesMarkdown: string, fullTranscript?: string) {
    return this.editContent(id, (ydoc) => {
      const fragment = ydoc.getXmlFragment('default');
      const minutes = markdownToElements(`${minutesMarkdown}\n\n---\n\n## 🎙️ Full Meeting Transcript\n`);
      if (fullTranscript) {
        fragment.delete(0, fragment.length);
        fragment.push([...minutes, ...markdownToElements(fullTranscript)]);
      } else {
        // What was transcribed live stays, below the minutes.
        fragment.insert(0, minutes);
      }
    });
  },

  /**
   * Notes the caller can read, across every module they can reach, whose title
   * or text matches. Newest first, with the matching passage.
   */
  async search(query: string, requesterId: string, authorization: string) {
    const q = query.trim().slice(0, 100);
    if (q.length < 2) return [];

    const modules = await accessService.myModules(authorization);
    if (modules.length === 0) return [];
    const byId = new Map(modules.map((m) => [m.id, m]));

    const pattern = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const rows = await db
      .select()
      .from(documents)
      .where(
        and(
          inArray(documents.moduleId, [...byId.keys()]),
          eq(documents.isDeleted, false),
          or(eq(documents.creatorId, requesterId), eq(documents.visibility, 'public')),
          or(ilike(documents.title, pattern), ilike(documents.contentSnapshot, pattern))
        )
      )
      .orderBy(desc(documents.updatedAt))
      .limit(20);

    const needle = q.toLowerCase();
    return rows.map((doc) => {
      const text = htmlToText(doc.contentSnapshot);
      const at = text.toLowerCase().indexOf(needle);
      const snippet =
        at === -1 ? text.slice(0, 120) : `${at > 40 ? '…' : ''}${text.slice(Math.max(0, at - 40), at + needle.length + 80)}`;
      const mod = byId.get(doc.moduleId)!;
      return {
        id: doc.id,
        title: doc.title,
        snippet,
        updatedAt: doc.updatedAt.toISOString(),
        moduleId: doc.moduleId,
        moduleName: mod.name,
        projectId: mod.projectId,
        projectName: mod.projectName,
      };
    });
  },
};
