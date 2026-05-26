import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Search, MoreVertical, Trash2, Copy, FileText } from 'lucide-react';
import { PageContainer } from '../../components/Layout/PageContainer';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { RichTextEditor } from './RichTextEditor';
import { DocumentList } from './DocumentList';
import { toast } from '../../components/ui/Toast';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
}

// Mock data for notes
const mockNotes: Note[] = [
  {
    id: '1',
    title: 'Feature Spec: Video Sync Integration',
    content: '<h1>Feature Spec</h1><p>This document outlines the technical requirements...</p>',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectId: '3',
  },
  {
    id: '2',
    title: 'Sprint Planning - Week 5',
    content: '<h2>Sprint Goals</h2><p>Complete WebRTC integration...</p>',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectId: '3',
  },
  {
    id: '3',
    title: 'Meeting Notes - May 22, 2026',
    content: '<p>Discussion about UI/UX improvements...</p>',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectId: '3',
  },
];

export const NotesPage: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>(mockNotes);
  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewNoteOptions, setShowNewNoteOptions] = useState(false);

  const sidebarItems = [
    { icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { icon: '📁', label: 'Projects', href: '/projects' },
    { icon: '✅', label: 'My Tasks', href: '/tasks' },
    { icon: '📅', label: 'Calendar', href: '/calendar' },
    { icon: '📄', label: 'Files', href: '/files' },
  ];

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '<p>Start writing here...</p>',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectId: projectId || '3',
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
    toast.success('New note created');
    setShowNewNoteOptions(false);
  };

  const updateNote = (updatedNote: Note) => {
    setNotes(prev => prev.map(note => 
      note.id === updatedNote.id ? updatedNote : note
    ));
    setSelectedNote(updatedNote);
  };

  const deleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(notes[0] || null);
    }
    toast.success('Note deleted');
  };

  const duplicateNote = (note: Note) => {
    const duplicatedNote: Note = {
      ...note,
      id: Date.now().toString(),
      title: `${note.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes([duplicatedNote, ...notes]);
    toast.success('Note duplicated');
  };

  return (
    <PageContainer
      title="Notes"
      sidebarItems={sidebarItems}
      topBarActions={
        <div className="flex gap-3 items-center">
          <div className="relative">
            <AnimatedButton
              variant="primary"
              size="sm"
              onClick={() => setShowNewNoteOptions(!showNewNoteOptions)}
            >
              <Plus className="w-4 h-4 mr-1" />
              New Note
            </AnimatedButton>
            {showNewNoteOptions && (
              <div className="absolute right-0 mt-2 w-48 glass rounded-lg shadow-lg overflow-hidden z-10">
                <button
                  onClick={createNewNote}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Blank Note
                </button>
              </div>
            )}
          </div>
          <ThemeToggle />
        </div>
      }
    >
      <div className="flex h-[calc(100vh-100px)]">
        {/* Document List Sidebar */}
        <DocumentList
          notes={filteredNotes}
          selectedNoteId={selectedNote?.id || null}
          onSelectNote={setSelectedNote}
          onDeleteNote={deleteNote}
          onDuplicateNote={duplicateNote}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Editor Area */}
        <div className="flex-1 ml-6">
          {selectedNote ? (
            <RichTextEditor
              note={selectedNote}
              onUpdate={updateNote}
              projectId={projectId || '3'}
            />
          ) : (
            <div className="glass-card p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No note selected</h3>
              <p className="text-gray-500 mb-4">Select a note from the sidebar or create a new one</p>
              <AnimatedButton variant="primary" onClick={createNewNote}>
                <Plus className="w-4 h-4 mr-1" />
                Create New Note
              </AnimatedButton>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};
