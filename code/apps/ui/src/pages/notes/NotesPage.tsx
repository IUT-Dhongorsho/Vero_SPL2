import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Search, MoreVertical, Trash2, Copy, FileText, Calendar, LayoutDashboard, FolderKanban, CheckSquare, CalendarDays, Files } from 'lucide-react';
import { PageContainer } from '../../components/Layout/PageContainer';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { RichTextEditor } from './RichTextEditor';
import { toast } from '../../components/Providers/ToastProvider';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
}

const mockNotes: Note[] = [
  {
    id: '1',
    title: 'Feature Spec: Video Sync Integration',
    content: '<h1>Feature Spec</h1><p>This document outlines the technical requirements for the video sync feature.</p>',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectId: '3',
  },
  {
    id: '2',
    title: 'Sprint Planning - Week 5',
    content: '<h2>Sprint Goals</h2><p>Complete WebRTC integration and implement Yjs collaboration.</p>',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectId: '3',
  },
  {
    id: '3',
    title: 'Meeting Notes - May 22, 2026',
    content: '<p>Discussion about UI/UX improvements and dark mode implementation.</p>',
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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', href: '/dashboard' },
    { icon: <FolderKanban className="w-4 h-4" />, label: 'Projects', href: '/projects' },
    { icon: <CheckSquare className="w-4 h-4" />, label: 'My Tasks', href: '/tasks' },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'Calendar', href: '/calendar' },
    { icon: <Files className="w-4 h-4" />, label: 'Files', href: '/files' },
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <PageContainer
      title="Notes"
      sidebarItems={sidebarItems}
      topBarActions={
        <div className="flex gap-3 items-center">
          <AnimatedButton variant="primary" size="sm" onClick={createNewNote}>
            <Plus className="w-4 h-4 mr-1" />
            New Note
          </AnimatedButton>
          <ThemeToggle />
        </div>
      }
    >
      <div className="flex h-[calc(100vh-100px)] gap-6">
        {/* Document List Sidebar */}
        <div className="w-80 glass rounded-xl flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 glass rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No notes found</p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`relative group rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                    selectedNote?.id === note.id
                      ? 'bg-blue-500/20 border border-blue-500/50'
                      : 'hover:bg-white/20'
                  }`}
                  onClick={() => setSelectedNote(note)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1 line-clamp-1">{note.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(new Date(note.updatedAt))}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === note.id ? null : note.id);
                        }}
                        className="p-1 rounded hover:bg-white/20 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeMenuId === note.id && (
                        <div className="absolute right-0 mt-1 w-32 glass rounded-lg shadow-lg overflow-hidden z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateNote(note);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
                          >
                            <Copy className="w-3 h-3" />
                            Duplicate
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNote(note.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-white/20 transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1">
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
