import { apiClient } from '../utils/apiClient';
import type { Note, NoteListItem, CreateNoteDTO, UpdateNoteMetaDTO } from '../../../../packages/shared/src/types/notes.types';
import type { WorkPriority } from './workService';

export interface NoteSearchHit {
  id: string;
  title: string;
  snippet: string;
  updatedAt: string;
  moduleId: string;
  moduleName: string;
  projectId: string;
  projectName: string;
}

export interface AiStatus {
  available: boolean;
  reason: 'ok' | 'worker_offline' | 'not_configured';
  model: string | null;
}

export interface NoteDigest {
  summary: string;
  keyPoints: string[];
  actionItems: { title: string; detail: string; priority: WorkPriority }[];
}

export const notesService = {
  list: async (moduleId: string): Promise<NoteListItem[]> => {
    return apiClient.get(`/notes/modules/${moduleId}/documents`).then(r => r.data);
  },
  getById: async (id: string): Promise<Note> => {
    return apiClient.get(`/notes/documents/${id}`).then(r => r.data);
  },
  create: async (dto: CreateNoteDTO): Promise<Note> => {
    return apiClient.post(`/notes/modules/${dto.moduleId}/documents`, dto).then(r => r.data);
  },
  updateMeta: async (id: string, dto: UpdateNoteMetaDTO): Promise<Note> => {
    return apiClient.patch(`/notes/documents/${id}`, dto).then(r => r.data);
  },
  updateContent: async (id: string, content: string): Promise<Note> => {
    return apiClient.patch(`/notes/documents/${id}/content`, { content }).then(r => r.data);
  },
  /** Notifies people @mentioned in the note; `notified` is how many could be. */
  mention: async (id: string, userIds: string[]): Promise<{ notified: number }> => {
    return apiClient.post(`/notes/documents/${id}/mentions`, { userIds }).then(r => r.data);
  },
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/notes/documents/${id}`).then(r => r.data);
  },
  /** Notes you can read, across all your modules. */
  search: async (q: string): Promise<NoteSearchHit[]> => {
    return apiClient.get('/notes/search', { params: { q } }).then(r => r.data);
  },
  aiStatus: async (): Promise<AiStatus> => {
    return apiClient.get('/notes/ai/status').then(r => r.data);
  },
  /** Summary, key points and action items. Can take several seconds. */
  digest: async (id: string): Promise<NoteDigest> => {
    return apiClient.post(`/notes/documents/${id}/digest`, {}, { timeout: 135_000 }).then(r => r.data);
  },
};
