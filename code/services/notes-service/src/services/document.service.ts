import { db } from '../db/client.js';
import { documents } from '../models/document.model.js';
import { yjsUpdates } from '../models/snapshot.model.js';
import { eq, and } from 'drizzle-orm';
// Use local types since shared package might not be wired in backend yet
import type { CreateNoteDTO, UpdateNoteMetaDTO } from '../../../../packages/shared/src/types/notes.types.js';

export const documentService = {
  async list(moduleId: string, requesterId: string) {
    const docs = await db.query.documents.findMany({
      where: and(
        eq(documents.moduleId, moduleId),
        eq(documents.isDeleted, false)
      ),
      orderBy: (documents, { desc }) => [desc(documents.updatedAt)]
    });

    // Filter visibility
    const filtered = docs.filter(doc => 
      doc.visibility === 'public' || doc.creatorId === requesterId
    );

    return filtered.map(doc => ({
      ...doc,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      previewText: doc.contentSnapshot.substring(0, 150) // simple preview
    }));
  },

  async getRawById(id: string) {
    return await db.query.documents.findFirst({
      where: and(
        eq(documents.id, id),
        eq(documents.isDeleted, false)
      )
    });
  },

  async getById(id: string, requesterId: string) {
    const doc = await this.getRawById(id);

    if (!doc) return null;
    
    // Check privacy
    if (doc.visibility === 'private' && doc.creatorId !== requesterId) {
      throw new Error('Forbidden');
    }

    return {
      ...doc,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  },

  async create(dto: CreateNoteDTO, creatorId: string) {
    const [doc] = await db.insert(documents).values({
      moduleId: dto.moduleId,
      creatorId,
      title: dto.title,
      visibility: dto.visibility,
      editPermission: dto.editPermission
    }).returning();

    return {
      ...doc,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  },

  async updateMeta(id: string, dto: UpdateNoteMetaDTO, requesterId: string) {
    const doc = await this.getById(id, requesterId);
    if (!doc) throw new Error('Not found');

    if (doc.creatorId !== requesterId) {
      throw new Error('Forbidden: Only creator can update metadata');
    }

    const [updated] = await db.update(documents)
      .set({
        ...dto,
        updatedAt: new Date()
      })
      .where(eq(documents.id, id))
      .returning();

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    };
  },

  async updateContent(id: string, content: string, requesterId: string) {
    const doc = await this.getById(id, requesterId);
    if (!doc) throw new Error('Not found');

    if (doc.creatorId !== requesterId) {
      throw new Error('Forbidden: Only creator can update content');
    }

    const [updated] = await db.update(documents)
      .set({
        contentSnapshot: content,
        updatedAt: new Date()
      })
      .where(eq(documents.id, id))
      .returning();

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    };
  },

  async delete(id: string, requesterId: string) {
    const doc = await this.getById(id, requesterId);
    if (!doc) throw new Error('Not found');
    
    if (doc.creatorId !== requesterId) {
      throw new Error('Forbidden: Only creator can delete');
    }

    await db.update(documents)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(documents.id, id));
  },

  async saveYjsState(id: string, state: Uint8Array, snapshot: string) {
    await db.update(documents)
      .set({
        yjsState: Buffer.from(state).toString('base64'),
        contentSnapshot: snapshot,
        updatedAt: new Date()
      })
      .where(eq(documents.id, id));
  }
};
