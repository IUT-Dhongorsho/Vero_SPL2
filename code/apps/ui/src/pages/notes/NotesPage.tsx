import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, MoreVertical, Trash2, Copy, FileText, Calendar, ArrowLeft, PanelLeftClose, PanelLeft, Lock, Globe, Eye, Edit2 } from 'lucide-react';
import { PageContainer } from '../../components/Layout/PageContainer';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { RichTextEditor } from './RichTextEditor';
import { toast } from '../../components/Providers/ToastProvider';
import { useNotesStore } from '../../stores/notes.store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import type { NoteListItem, NoteVisibility, NoteEditPermission } from '../../../../packages/shared/src/types/notes.types';

export const NotesPage: React.FC = () => {
  const { workspaceId, projectId, moduleId } = useParams();
  const navigate = useNavigate();
  const { notes, activeNote, fetchNotes, openNote, createNote, deleteNote, duplicateNote, isLoading } = useNotesStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newVisibility, setNewVisibility] = useState<NoteVisibility>('private');
  const [newPermission, setNewPermission] = useState<NoteEditPermission>('editable');

  useEffect(() => {
    if (moduleId) {
      fetchNotes(moduleId);
    }
  }, [moduleId, fetchNotes]);

  useEffect(() => {
    if (!activeNote && notes.length > 0 && !isLoading) {
      openNote(notes[0].id);
    }
  }, [notes, activeNote, isLoading, openNote]);

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSubmit = async () => {
    if (!moduleId) return;
    try {
      const created = await createNote({
        moduleId,
        title: newTitle || 'Untitled Note',
        visibility: newVisibility,
        editPermission: newPermission,
      });
      setIsCreateModalOpen(false);
      setNewTitle('');
      toast.success('New note created');
      openNote(created.id);
    } catch (e) {
      toast.error('Failed to create note');
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      toast.success('Note deleted');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to delete note');
    }
  };

  const handleDuplicate = async (note: NoteListItem) => {
    try {
      const dup = await duplicateNote(note);
      toast.success('Note duplicated');
      openNote(dup.id);
    } catch (e) {
      toast.error('Failed to duplicate note');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
                       <div>
                        <AnimatedButton variant="outline" size="sm" onClick={() => navigate(`/project/${projectId}/module/${moduleId}`)} className="text-muted-foreground border-transparent hover:bg-muted p-2">
                          <ArrowLeft className="w-4 h-4 mr-2" /> Back
                        </AnimatedButton>
                      </div>
                       <h2 className="text-lg font-bold text-foreground">Notes</h2>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setIsCreateModalOpen(true)} className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors flex items-center justify-center" title="Create New Note">
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
                  {isLoading ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">Loading notes...</div>
                  ) : filteredNotes.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">No notes found</p>
                      <button onClick={() => setIsCreateModalOpen(true)} className="mt-3 text-primary text-sm font-semibold hover:underline">
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
                          activeNote?.id === note.id
                            ? 'bg-primary/10 border-transparent shadow-sm'
                            : 'hover:bg-muted/50 border-transparent'
                        }`}
                        onClick={() => openNote(note.id)}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className={`font-semibold text-sm mb-1 truncate flex items-center gap-1.5 ${activeNote?.id === note.id ? 'text-primary' : 'text-foreground'}`}>
                            {note.visibility === 'private' ? <Lock className="w-3 h-3 text-muted-foreground" /> : <Globe className="w-3 h-3 text-emerald-500" />}
                            {note.title || 'Untitled Note'}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(note.updatedAt)}</span>
                            {note.visibility === 'public' && note.editPermission === 'read-only' && (
                              <span className="flex items-center gap-1 ml-1"><Eye className="w-3 h-3" /> Read-only</span>
                            )}
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

          {activeNote ? (
            <div className={!isSidebarOpen ? "pt-8 h-full" : "h-full"}>
              <RichTextEditor note={activeNote} />
            </div>
          ) : (
            <div className="m-auto text-center max-w-sm p-8">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                 <FileText className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No note selected</h3>
              <p className="text-muted-foreground mb-8">Select a note from the sidebar or start fresh by creating a new one.</p>
              <AnimatedButton variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Create New Note
              </AnimatedButton>
            </div>
          )}
        </div>

      </div>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 my-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input 
                type="text" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Untitled Note"
                className="w-full p-2 border rounded-md bg-background focus:outline-none focus:border-primary"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium">Visibility</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setNewVisibility('private')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${newVisibility === 'private' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
                >
                  <Lock className="w-5 h-5 mb-1" />
                  <span className="font-semibold text-sm">Private</span>
                  <span className="text-[10px] opacity-70">Only you can access</span>
                </button>
                <button
                  onClick={() => setNewVisibility('public')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${newVisibility === 'public' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
                >
                  <Globe className="w-5 h-5 mb-1" />
                  <span className="font-semibold text-sm">Public</span>
                  <span className="text-[10px] opacity-70">Visible to module members</span>
                </button>
              </div>
            </div>

            {newVisibility === 'public' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium">Edit Permission</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewPermission('read-only')}
                    className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all justify-center ${newPermission === 'read-only' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
                  >
                    <Eye className="w-4 h-4" />
                    <span className="font-semibold text-sm">Read-only</span>
                  </button>
                  <button
                    onClick={() => setNewPermission('editable')}
                    className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all justify-center ${newPermission === 'editable' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="font-semibold text-sm">Editable</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSubmit}>Create Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
