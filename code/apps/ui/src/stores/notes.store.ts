import { create } from 'zustand';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  moduleId: string;
  isPrivate: boolean;
}

interface NotesState {
  notes: Note[];
  fetchNotes: (moduleId: string) => void;
  createNote: (moduleId: string) => Note;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  duplicateNote: (note: Note) => Note;
  togglePrivacy: (id: string) => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  fetchNotes: (moduleId: string) => {
    // Mock data
    set({
      notes: [
        {
          id: '1',
          title: 'Feature Spec: Authentication',
          content: '<h1>Feature Spec</h1><p>We need to implement OAuth2 and SAML.</p>',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          moduleId,
          isPrivate: false,
        },
        {
          id: '2',
          title: 'API Design Docs',
          content: '<h2>Endpoints</h2><ul><li>GET /api/users</li></ul>',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          moduleId,
          isPrivate: false,
        }
      ]
    });
  },
  createNote: (moduleId: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '<p></p>',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      moduleId,
      isPrivate: false,
    };
    set((state) => ({ notes: [newNote, ...state.notes] }));
    return newNote;
  },
  updateNote: (updatedNote: Note) => {
    set((state) => ({
      notes: state.notes.map((n) => n.id === updatedNote.id ? { ...updatedNote, updatedAt: new Date().toISOString() } : n)
    }));
  },
  deleteNote: (id: string) => {
    set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));
  },
  duplicateNote: (note: Note) => {
    const duplicated: Note = {
      ...note,
      id: Date.now().toString(),
      title: `${note.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPrivate: note.isPrivate,
    };
    set((state) => ({ notes: [duplicated, ...state.notes] }));
    return duplicated;
  },
  togglePrivacy: (id: string) => {
    set((state) => ({
      notes: state.notes.map(n => n.id === id ? { ...n, isPrivate: !n.isPrivate, updatedAt: new Date().toISOString() } : n)
    }));
  }
}));
