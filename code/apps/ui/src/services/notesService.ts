import { apiClient } from '../utils/apiClient';
import type { Note, NoteListItem, CreateNoteDTO, UpdateNoteMetaDTO } from '../../../../packages/shared/src/types/notes.types';

// Temporarily point to the specific port for notes service if VITE_NOTES_API_URL is defined,
// otherwise relies on an API Gateway or reverse proxy which might not exist locally yet.
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
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/notes/documents/${id}`).then(r => r.data);
  },
};
