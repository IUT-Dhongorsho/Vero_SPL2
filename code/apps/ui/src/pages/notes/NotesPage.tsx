import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Eye, FileText, Lock, Plus, Search, Trash2, Users } from 'lucide-react';
import { PageContainer } from '../../components/Layout/PageContainer';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { Modal } from '../../components/ui/Modal';
import { Field, inputClass } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { RowMenu } from '../../components/ui/RowMenu';
import { toast } from '../../components/Providers/ToastProvider';
import { RichTextEditor } from './RichTextEditor';
import { useNotesStore } from '../../stores/notes.store';
import { useAuthStore } from '../../stores/auth.store';
import { useModule } from '../../hooks/useModule';
import { errorMessage } from '../../utils/errors';
import { timeAgo } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';
import type { NoteListItem, NoteVisibility, NoteEditPermission } from '../../../../../packages/shared/src/types/notes.types';

const SHARING: { id: 'private' | 'view' | 'edit'; label: string; hint: string; icon: typeof Lock }[] = [
  { id: 'private', label: 'Only you', hint: 'A private draft', icon: Lock },
  { id: 'view', label: 'Module can view', hint: 'Teammates read it', icon: Eye },
  { id: 'edit', label: 'Module can edit', hint: 'Write it together live', icon: Users },
];

const sharingIcon = (note: NoteListItem) =>
  note.visibility === 'private' ? Lock : note.editPermission === 'editable' ? Users : Eye;

export const NotesPage: React.FC = () => {
  const { projectId, moduleId } = useParams();
  const [params, setParams] = useSearchParams();
  const me = useAuthStore((s) => s.user);
  const { module } = useModule(moduleId);
  const { notes, activeNote, fetchNotes, openNote, createNote, deleteNote, duplicateNote, isLoading } = useNotesStore();
  const canWrite = !!module && module.userRole !== 'viewer';

  const [searchQuery, setSearchQuery] = useState('');
  const [showListOnMobile, setShowListOnMobile] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSharing, setNewSharing] = useState<'private' | 'view' | 'edit'>('private');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<NoteListItem | null>(null);

  useEffect(() => {
    if (moduleId) fetchNotes(moduleId);
  }, [moduleId, fetchNotes]);

  // Open the note named in the URL, or the newest one — never one left over
  // from another module.
  const requested = params.get('note');
  useEffect(() => {
    if (isLoading) return;
    const wanted = requested && notes.some((n) => n.id === requested) ? requested : null;
    const stale = activeNote && activeNote.moduleId !== moduleId;
    if (wanted && activeNote?.id !== wanted) openNote(wanted);
    else if ((!activeNote || stale) && notes.length > 0) openNote(notes[0].id);
  }, [notes, activeNote, isLoading, openNote, requested, moduleId]);

  const shownNote = activeNote && activeNote.moduleId === moduleId ? activeNote : null;

  const filteredNotes = useMemo(
    () => notes.filter((note) => note.title.toLowerCase().includes(searchQuery.trim().toLowerCase())),
    [notes, searchQuery]
  );

  const select = (id: string) => {
    setParams({ note: id }, { replace: true });
    openNote(id);
    setShowListOnMobile(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleId) return;
    setCreating(true);
    try {
      const sharing: { visibility: NoteVisibility; editPermission: NoteEditPermission } =
        newSharing === 'private'
          ? { visibility: 'private', editPermission: 'editable' }
          : { visibility: 'public', editPermission: newSharing === 'edit' ? 'editable' : 'read-only' };
      const created = await createNote({ moduleId, title: newTitle.trim() || 'Untitled note', ...sharing });
      setCreateOpen(false);
      setNewTitle('');
      setParams({ note: created.id }, { replace: true });
      setShowListOnMobile(false);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not create the note'));
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (note: NoteListItem) => {
    try {
      const dup = await duplicateNote(note);
      toast.success(`Made a private copy of ${note.title}`);
      select(dup.id);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not duplicate the note'));
    }
  };

  return (
    <PageContainer
      title={module ? `${module.name} notes` : 'Notes'}
      subtitle={module?.project?.name}
      topBarActions={
        canWrite ? (
          <AnimatedButton size="sm" variant="accent" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New note</span>
          </AnimatedButton>
        ) : null
      }
    >
      <div className="flex h-[calc(100vh-8.5rem)] gap-5">
        {/* Notes list */}
        <aside
          className={cn(
            'surface rounded-2xl flex-col overflow-hidden w-full md:w-80 shrink-0',
            showListOnMobile ? 'flex' : 'hidden md:flex'
          )}
        >
          <div className="p-4 border-b border-border space-y-3">
            <Link
              to={`/project/${projectId}/module/${moduleId}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {module?.name ?? 'Module'}
            </Link>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Find a note"
                aria-label="Find a note"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(inputClass, 'pl-9 py-2 text-sm')}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoading && notes.length === 0 ? (
              <div className="space-y-2 p-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-xl skeleton-shimmer" />
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-12 px-4">
                <FileText className="w-10 h-10 text-subtle-foreground mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium text-foreground">
                  {searchQuery ? `No note is called “${searchQuery}”` : 'No notes in this module yet'}
                </p>
                {!searchQuery && canWrite && (
                  <button onClick={() => setCreateOpen(true)} className="mt-2 text-sm font-medium text-accent hover:underline">
                    Write the first one
                  </button>
                )}
              </div>
            ) : (
              <ul className="space-y-0.5">
                {filteredNotes.map((note) => {
                  const Icon = sharingIcon(note);
                  const active = shownNote?.id === note.id;
                  const mine = note.creatorId === me?.id;
                  return (
                    <li
                      key={note.id}
                      className={cn(
                        'group flex items-start gap-1 rounded-xl transition-colors',
                        active ? 'bg-accent-soft' : 'hover:bg-muted'
                      )}
                    >
                      <button onClick={() => select(note.id)} className="flex-1 min-w-0 text-left px-3 py-2.5">
                        <span className={cn('flex items-center gap-1.5 text-sm font-medium truncate', active ? 'text-accent' : 'text-foreground')}>
                          <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          <span className="truncate">{note.title || 'Untitled note'}</span>
                        </span>
                        <span className="block text-xs text-muted-foreground truncate mt-0.5">
                          {note.previewText || 'Empty'}
                        </span>
                        <span className="block text-2xs text-subtle-foreground mt-1">Edited {timeAgo(note.updatedAt)}</span>
                      </button>
                      <span className="pt-2 pr-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100">
                        <RowMenu
                          label={`Actions for ${note.title}`}
                          items={[
                            { label: 'Duplicate', icon: Copy, hidden: !canWrite, onSelect: () => handleDuplicate(note) },
                            {
                              label: 'Delete',
                              icon: Trash2,
                              danger: true,
                              hidden: !(mine || module?.userRole === 'admin'),
                              onSelect: () => setDeleting(note),
                            },
                          ]}
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Editor */}
        <section
          className={cn(
            'flex-1 surface rounded-2xl overflow-hidden flex-col min-w-0',
            showListOnMobile ? 'hidden md:flex' : 'flex'
          )}
        >
          <button
            onClick={() => setShowListOnMobile(true)}
            className="md:hidden flex items-center gap-1.5 px-4 py-3 text-sm text-muted-foreground border-b border-border"
          >
            <ArrowLeft className="w-4 h-4" /> All notes
          </button>
          {shownNote && moduleId ? (
            <RichTextEditor key={shownNote.id} note={shownNote} moduleId={moduleId} canWriteModule={canWrite} />
          ) : (
            <div className="m-auto text-center max-w-sm p-8">
              <FileText className="w-10 h-10 text-subtle-foreground mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {notes.length ? 'Pick a note to read it' : 'Nothing written here yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Notes can stay private or be written together with the module, live.
              </p>
              {canWrite && (
                <AnimatedButton variant="primary" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4" /> New note
                </AnimatedButton>
              )}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New note"
        footer={
          <>
            <AnimatedButton variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </AnimatedButton>
            <AnimatedButton type="submit" form="create-note" variant="primary" loading={creating}>
              Create note
            </AnimatedButton>
          </>
        }
      >
        <form id="create-note" onSubmit={handleCreateSubmit} className="space-y-5">
          <Field label="Title">
            {(props) => (
              <input
                {...props}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Untitled note"
                maxLength={200}
                className={inputClass}
              />
            )}
          </Field>
          <fieldset>
            <legend className="text-sm font-medium text-foreground mb-2">Who can see it</legend>
            <div className="grid sm:grid-cols-3 gap-2">
              {SHARING.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    'flex flex-col gap-1 p-3 rounded-xl border cursor-pointer transition-colors',
                    newSharing === option.id ? 'border-accent bg-accent-soft' : 'border-border hover:bg-muted'
                  )}
                >
                  <input
                    type="radio"
                    name="sharing"
                    value={option.id}
                    checked={newSharing === option.id}
                    onChange={() => setNewSharing(option.id)}
                    className="sr-only"
                  />
                  <option.icon className={cn('w-4 h-4', newSharing === option.id ? 'text-accent' : 'text-muted-foreground')} />
                  <span className="text-sm font-medium text-foreground">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.title ?? 'this note'}?`}
        description="It is removed for everyone it was shared with."
        confirmLabel="Delete note"
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteNote(deleting.id);
            if (params.get('note') === deleting.id) setParams({}, { replace: true });
            toast.success(`Deleted ${deleting.title}`);
          } catch (error) {
            toast.error(errorMessage(error, 'Could not delete the note'));
            throw error;
          }
        }}
      />
    </PageContainer>
  );
};
