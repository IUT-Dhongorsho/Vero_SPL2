import { create } from 'zustand';
import { notesService } from '../services/notesService';
import { htmlToText } from '../utils/html';
import type { Note, NoteListItem, CreateNoteDTO, UpdateNoteMetaDTO } from '../../../../packages/shared/src/types/notes.types';

interface NotesState {
  notes: NoteListItem[];
  activeNote: Note | null;
  isLoading: boolean;
  isSaving: boolean;

  fetchNotes: (moduleId: string) => Promise<void>;
  openNote: (id: string) => Promise<void>;
  createNote: (dto: CreateNoteDTO) => Promise<Note>;
  updateNoteMeta: (id: string, dto: UpdateNoteMetaDTO) => Promise<void>;
  updateNoteContent: (id: string, content: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  duplicateNote: (note: NoteListItem) => Promise<Note>;
  setIsSaving: (v: boolean) => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  activeNote: null,
  isLoading: false,
  isSaving: false,

  fetchNotes: async (moduleId) => {
    set({ isLoading: true });
    try {
      const notes = await notesService.list(moduleId);
      set({ notes, isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  },

  openNote: async (id) => {
    try {
      const note = await notesService.getById(id);
      set({ activeNote: note });
    } catch (e) {
      console.error(e);
    }
  },

  createNote: async (dto) => {
    const note = await notesService.create(dto);
    const noteListItem: NoteListItem = {
      ...note,
      previewText: htmlToText(note.contentSnapshot ?? '').slice(0, 160)
    };
    set((s) => ({ notes: [noteListItem, ...s.notes], activeNote: note }));
    return note;
  },

  updateNoteMeta: async (id, dto) => {
    const updated = await notesService.updateMeta(id, dto);
    set((s) => ({
      notes: s.notes.map(n => n.id === id ? { ...n, ...updated } : n),
      activeNote: s.activeNote?.id === id ? { ...s.activeNote, ...updated } : s.activeNote,
    }));
  },

  updateNoteContent: async (id, content) => {
    const updated = await notesService.updateContent(id, content);
    set((s) => ({
      notes: s.notes.map(n => n.id === id ? { ...n, previewText: htmlToText(content).slice(0, 160), updatedAt: updated.updatedAt } : n),
      activeNote: s.activeNote?.id === id ? { ...s.activeNote, contentSnapshot: content } : s.activeNote,
    }));
  },

  deleteNote: async (id) => {
    await notesService.delete(id);
    set((s) => ({
      notes: s.notes.filter(n => n.id !== id),
      activeNote: s.activeNote?.id === id ? null : s.activeNote,
    }));
  },

  duplicateNote: async (note) => {
    // The list item has no body; fetch it so the copy is a real copy.
    const source = await notesService.getById(note.id);
    let dup = await notesService.create({
      moduleId: note.moduleId,
      title: `${note.title} (copy)`,
      visibility: 'private',
      editPermission: note.editPermission,
    });
    if (source.contentSnapshot) dup = await notesService.updateContent(dup.id, source.contentSnapshot);
    const dupListItem: NoteListItem = {
      ...dup,
      previewText: htmlToText(dup.contentSnapshot ?? '').slice(0, 160)
    };
    set((s) => ({ notes: [dupListItem, ...s.notes] }));
    return dup;
  },

  setIsSaving: (v) => set({ isSaving: v }),
}));
