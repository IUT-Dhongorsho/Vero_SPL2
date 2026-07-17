import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, MoreVertical, Trash2, Copy, FileText, Calendar, ArrowLeft, PanelLeftClose, PanelLeft } from 'lucide-react';
import { PageContainer } from '../../components/Layout/PageContainer';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { RichTextEditor } from './RichTextEditor';
import { toast } from '../../components/Providers/ToastProvider';
import { useNotesStore, Note } from '../../stores/notes.store';

export const NotesPage: React.FC = () => {
  const { workspaceId, projectId, moduleId } = useParams();
  const navigate = useNavigate();
  const { notes, fetchNotes, createNote, deleteNote, duplicateNote } = useNotesStore();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (moduleId) {
      fetchNotes(moduleId);
    }
  }, [moduleId, fetchNotes]);

  // Auto-select first note if none selected and notes exist
  useEffect(() => {
    if (!selectedNote && notes.length > 0) {
      setSelectedNote(notes[0]);
    } else if (notes.length === 0) {
      setSelectedNote(null);
    }
  }, [notes, selectedNote]);

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = () => {
    if (!moduleId) return;
    const newNote = createNote(moduleId);
    setSelectedNote(newNote);
    toast.success('New note created');
  };

  const handleDelete = (noteId: string) => {
    deleteNote(noteId);
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
    }
    toast.success('Note deleted');
  };

  const handleDuplicate = (note: Note) => {
    const dup = duplicateNote(note);
    setSelectedNote(dup);
    toast.success('Note duplicated');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <PageContainer title="Notes">
      <div className="max-w-[1600px] mx-auto flex h-[calc(100vh-140px)] gap-6 relative">
        
        {/* Document List Sidebar */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="bg-card border border-border rounded-2xl flex flex-col shadow-sm overflow-hidden shrink-0"
            >
              <div className="w-[320px] flex flex-col h-full">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <AnimatedButton variant="outline" size="sm" onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}/module/${moduleId}`)} className="text-muted-foreground border-transparent hover:bg-muted p-2">
                         <ArrowLeft className="w-4 h-4" />
                       </AnimatedButton>
                       <h2 className="text-lg font-bold text-foreground">Notes</h2>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={handleCreateNew} className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors flex items-center justify-center" title="Create New Note">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors md:hidden lg:flex" title="Close Sidebar">
                        <PanelLeftClose className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-muted text-foreground rounded-lg text-sm border-transparent focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {filteredNotes.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">No notes found</p>
                      <button onClick={handleCreateNew} className="mt-3 text-primary text-sm font-semibold hover:underline">
                        Create your first note
                      </button>
                    </div>
                  ) : (
                    filteredNotes.map((note) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`relative group rounded-xl p-3 cursor-pointer transition-all duration-200 flex items-center justify-between ${
                          selectedNote?.id === note.id
                            ? 'bg-primary/10 border-transparent shadow-sm'
                            : 'hover:bg-muted/50 border-transparent'
                        }`}
                        onClick={() => setSelectedNote(note)}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className={`font-semibold text-sm mb-1 truncate ${selectedNote?.id === note.id ? 'text-primary' : 'text-foreground'}`}>
                            {note.title || 'Untitled Note'}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(new Date(note.updatedAt))}</span>
                          </div>
                        </div>
                        
                        <div className="relative shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === note.id ? null : note.id);
                            }}
                            className={`p-1.5 rounded-md hover:bg-muted transition-colors ${activeMenuId === note.id ? 'bg-muted opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
                          >
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                          
                          {activeMenuId === note.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                              <div className="absolute right-0 top-8 w-36 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50 py-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDuplicate(note); setActiveMenuId(null); }}
                                  className="w-full text-left px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors flex items-center gap-2"
                                >
                                  <Copy className="w-4 h-4" /> Duplicate
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(note.id); setActiveMenuId(null); }}
                                  className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor Area */}
        <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col relative min-w-0">
          
          {/* Top Bar for Editor (Shows when sidebar is collapsed) */}
          <div className="absolute top-4 left-4 z-20">
            <AnimatePresence>
              {!isSidebarOpen && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 bg-card border border-border shadow-sm rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  title="Open Sidebar"
                >
                  <PanelLeft className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {selectedNote ? (
            <div className={!isSidebarOpen ? "pt-8 h-full" : "h-full"}>
              <RichTextEditor note={selectedNote} />
            </div>
          ) : (
            <div className="m-auto text-center max-w-sm p-8">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                 <FileText className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No note selected</h3>
              <p className="text-muted-foreground mb-8">Select a note from the sidebar or start fresh by creating a new one.</p>
              <AnimatedButton variant="primary" onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" /> Create New Note
              </AnimatedButton>
            </div>
          )}
        </div>

      </div>
    </PageContainer>
  );
};
