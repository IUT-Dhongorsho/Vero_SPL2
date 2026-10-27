import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Heading } from '@tiptap/extension-heading';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import { marked } from 'marked';
import {
  Bold,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Italic,
  LayoutDashboard,
  List,
  ListOrdered,
  Loader2,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { useNotesStore } from '../../stores/notes.store';
import { useAuthStore } from '../../stores/auth.store';
import { toast } from '../../components/Providers/ToastProvider';
import { colorFor, useYjs } from '../../hooks/useYjs';
import { mentionSuggestion, type MentionPerson } from '../../components/notes/mentionSuggestion';
import { AwarenessCursors } from '../../components/notes/AwarenessCursors';
import { SendToBoardModal, type DraftTask } from '../../components/notes/SendToBoardModal';
import { NoteDigestPanel } from '../../components/notes/NoteDigestPanel';
import { ShareMenu } from '../../components/notes/ShareMenu';
import { notesService, type AiStatus } from '../../services/notesService';
import { errorMessage } from '../../utils/errors';
import { cn } from '../../utils/cn';
import type { Note } from '../../../../../packages/shared/src/types/notes.types';

interface RichTextEditorProps {
  note: Note;
  moduleId: string;
  /** False for viewers of the module: they can read but not add to the board. */
  canWriteModule: boolean;
  /** The module's people, who can be @mentioned. */
  members?: MentionPerson[];
}

/** Text that reads as Markdown: headings, lists, quotes, fences, emphasis, links. */
const MARKDOWN = /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s?|```|- \[[ xX]\]\s)|\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|~~[^~\n]+~~/;
/** Clipboard HTML that already carries structure (a web page, a doc), not just styled text (a code editor). */
const STRUCTURED_HTML = /<(h[1-6]|ul|ol|li|strong|b|em|i|blockquote|table|pre|p)[\s>]/i;

/** How long to wait for the live note before showing the editor anyway. */
const SYNC_GRACE_MS = 5_000;

/** One status request per session; the worker's state rarely changes. */
let aiStatusPromise: Promise<AiStatus> | null = null;
const loadAiStatus = () => {
  aiStatusPromise ??= notesService.aiStatus().catch(() => ({ available: false, reason: 'worker_offline', model: null }) as AiStatus);
  return aiStatusPromise;
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ note, moduleId, canWriteModule, members }) => {
  const canCollaborate = note.visibility === 'public' && note.editPermission === 'editable' && note.canEdit !== false;
  const { ydoc, provider, status, synced, awareness } = useYjs({
    documentId: note.id,
    enabled: canCollaborate,
  });

  // Show the note once it has synced: an editor shown earlier is empty for a
  // moment, then fills — which read as text appearing and disappearing.
  const [waitedLong, setWaitedLong] = useState(false);
  useEffect(() => {
    setWaitedLong(false);
    if (!canCollaborate) return;
    const timer = setTimeout(() => setWaitedLong(true), SYNC_GRACE_MS);
    return () => clearTimeout(timer);
  }, [note.id, canCollaborate]);

  if (canCollaborate && (!ydoc || !provider || (!synced && !waitedLong))) {
    return (
      <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Joining the live note…
      </div>
    );
  }

  return (
    <RichTextEditorCore
      key={ydoc?.clientID || note.id}
      note={note}
      moduleId={moduleId}
      canWriteModule={canWriteModule}
      ydoc={ydoc}
      provider={provider}
      status={status}
      awareness={awareness}
      canCollaborate={canCollaborate}
      members={members}
    />
  );
};

interface RichTextEditorCoreProps extends RichTextEditorProps {
  ydoc: any;
  provider: any;
  status: string;
  awareness: any;
  canCollaborate: boolean;
}

const ToolButton: React.FC<{ onClick: () => void; active?: boolean; label: string; children: React.ReactNode }> = ({
  onClick,
  active,
  label,
  children,
}) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    aria-pressed={active}
    className={cn(
      'p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold',
      active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    )}
  >
    {children}
  </button>
);

const RichTextEditorCore: React.FC<RichTextEditorCoreProps> = ({
  note,
  moduleId,
  canWriteModule,
  ydoc,
  provider,
  status,
  awareness,
  canCollaborate,
  members,
}) => {
  const { updateNoteMeta, updateNoteContent } = useNotesStore();
  const { user } = useAuthStore();

  const [title, setTitle] = useState(note.title);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'failed'>('saved');
  const titleTimer = useRef<ReturnType<typeof setTimeout>>();
  const contentTimer = useRef<ReturnType<typeof setTimeout>>();

  const [boardItems, setBoardItems] = useState<DraftTask[] | null>(null);
  const [digestOpen, setDigestOpen] = useState(false);
  const [ai, setAi] = useState<AiStatus | null>(null);

  // The server decides; older responses without the flags fall back to authorship.
  const canManage = note.canManage ?? note.creatorId === user?.id;
  const isEditable = note.canEdit ?? (canCollaborate || canManage);

  // In a live note the title is shared too, so a rename shows for everyone at once.
  const shared = canCollaborate && ydoc ? ydoc.getMap('vero') : null;
  useEffect(() => {
    if (!shared) return;
    const pull = () => {
      const live = shared.get('title');
      if (typeof live === 'string') setTitle(live);
    };
    pull();
    shared.observe(pull);
    return () => shared.unobserve(pull);
  }, [shared]);

  // @mentions: who can be picked, and who has been notified this session.
  const peopleRef = useRef<MentionPerson[]>([]);
  peopleRef.current = (members ?? []).filter((m) => m.id !== user?.id);
  const notified = useRef(new Set<string>());
  const notifyRef = useRef<(userId: string) => void>(() => {});
  notifyRef.current = async (userId: string) => {
    if (notified.current.has(userId)) return;
    notified.current.add(userId);
    try {
      const { notified: count } = await notesService.mention(note.id, [userId]);
      if (count === 0 && note.visibility !== 'public') {
        toast('Only you can see this note, so nobody was notified. Share it with the module first.', { id: 'private-mention' });
      }
    } catch (error) {
      notified.current.delete(userId);
      toast.error(errorMessage(error, 'Could not notify the person you mentioned'));
    }
  };
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    loadAiStatus().then(setAi);
  }, []);

  useEffect(() => {
    setTitle(note.title);
  }, [note.id, note.title]);

  useEffect(
    () => () => {
      clearTimeout(titleTimer.current);
      clearTimeout(contentTimer.current);
    },
    []
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setTitle(next);
    if (!isEditable) return;
    shared?.set('title', next);
    setSaveState('saving');
    clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(async () => {
      try {
        await updateNoteMeta(note.id, { title: next });
        setSaveState('saved');
      } catch {
        setSaveState('failed');
      }
    }, 800);
  };

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          history: canCollaborate ? false : undefined,
          heading: false,
        }),
        Heading.extend({
          renderHTML({ node, HTMLAttributes }) {
            const numLevel = Number(node.attrs.level);
            const level = [1, 2, 3].includes(numLevel) ? numLevel : 1;
            return [`h${level}`, mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
          },
        }).configure({ levels: [1, 2, 3] }),
        Placeholder.configure({ placeholder: isEditable ? 'Start writing…' : 'This note is empty.' }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Link.configure({
          autolink: true,
          linkOnPaste: true,
          openOnClick: !isEditable,
          HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' },
        }),
        Mention.configure({
          HTMLAttributes: { class: 'rounded-md px-1 py-0.5 bg-accent-soft text-accent font-medium no-underline' },
          renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
          renderHTML: ({ options, node }) => ['span', options.HTMLAttributes, `@${node.attrs.label ?? node.attrs.id}`],
          suggestion: {
            ...mentionSuggestion(() => peopleRef.current),
            command: ({ editor, range, props }) => {
              editor
                .chain()
                .focus()
                .insertContentAt(range, [
                  { type: 'mention', attrs: props },
                  { type: 'text', text: ' ' },
                ])
                .run();
              notifyRef.current(String(props.id));
            },
          },
        }),
        ...(canCollaborate && ydoc && provider
          ? [
              Collaboration.configure({ document: ydoc }),
              CollaborationCursor.configure({
                provider,
                user: { id: user?.id, name: user?.name || 'Anonymous', color: colorFor(user?.id ?? 'anon') },
              }),
            ]
          : []),
      ],
      content: canCollaborate ? undefined : note.contentSnapshot,
      editable: isEditable,
      editorProps: {
        attributes: {
          class:
            'prose max-w-none focus:outline-none min-h-[420px] w-full text-foreground marker:text-foreground prose-p:text-foreground prose-headings:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-accent',
        },
        // Pasted Markdown becomes formatting instead of literal ** and #.
        handlePaste: (view, event) => {
          const data = event.clipboardData;
          const text = data?.getData('text/plain') ?? '';
          if (!text || !MARKDOWN.test(text)) return false;
          if (STRUCTURED_HTML.test(data?.getData('text/html') ?? '')) return false;
          if (view.state.selection.$from.parent.type.name === 'codeBlock') return false;
          const html = marked.parse(text, { gfm: true, breaks: false, async: false }) as string;
          editorRef.current?.chain().focus().insertContent(html).run();
          return true;
        },
      },
      onUpdate: ({ editor }) => {
        if (canCollaborate) return; // the live document saves itself
        setSaveState('saving');
        clearTimeout(contentTimer.current);
        contentTimer.current = setTimeout(async () => {
          try {
            await updateNoteContent(note.id, editor.getHTML());
            setSaveState('saved');
          } catch (error) {
            setSaveState('failed');
            toast.error(errorMessage(error, 'Your last change was not saved'));
          }
        }, 900);
      },
    },
    [note.id, canCollaborate, ydoc, provider, isEditable]
  );
  editorRef.current = editor;

  // A note made shareable after it was written has saved HTML but an empty
  // live document. The first person in copies the HTML across; the flag lives
  // in the shared document, so two people arriving together cannot both do it.
  useEffect(() => {
    if (!canCollaborate || !editor || !provider || !ydoc || !note.contentSnapshot) return;
    const seed = (synced: boolean) => {
      if (!synced) return;
      const meta = ydoc.getMap('vero');
      // Ask the shared document, not the editor: the editor renders synced
      // content a tick later and would still look empty here.
      if (meta.get('seeded') || ydoc.getXmlFragment('default').length > 0) return;
      ydoc.transact(() => meta.set('seeded', true));
      editor.commands.setContent(note.contentSnapshot);
    };
    if (provider.synced) seed(true);
    provider.on('sync', seed);
    return () => provider.off('sync', seed);
  }, [canCollaborate, editor, provider, ydoc, note.contentSnapshot]);

  const sendSelectionToBoard = (ed: Editor) => {
    const { from, to } = ed.state.selection;
    const text = ed.state.doc.textBetween(from, to, ' ').trim();
    if (!text) {
      toast.error('Select the text you want as a task first', { id: 'select-text-first' });
      return;
    }
    setBoardItems([{ title: text }]);
  };

  const changeSharing = async (next: { visibility: Note['visibility']; editPermission: Note['editPermission'] }) => {
    try {
      await updateNoteMeta(note.id, next);
      toast.success(
        next.visibility === 'private'
          ? 'Only you can see this note now'
          : next.editPermission === 'editable'
            ? 'The module can now edit this note with you'
            : 'The module can now read this note'
      );
    } catch (error) {
      toast.error(errorMessage(error, 'Could not change who can see it'));
    }
  };

  if (!editor) return null;

  const aiHint = !ai
    ? 'Checking whether AI is available…'
    : ai.available
      ? 'Summarise this note and pull out its action items'
      : ai.reason === 'not_configured'
        ? 'AI summaries need a Gemini API key on the server'
        : 'The AI worker is not running on the server';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-6 md:px-10 pt-6 pb-3 border-b border-border flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <label className="group relative flex items-center min-w-0 flex-1 -mx-2">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              readOnly={!isEditable}
              aria-label={isEditable ? 'Note title, click to rename' : 'Note title'}
              title={isEditable ? 'Click to rename' : undefined}
              className={cn(
                'text-2xl md:text-3xl font-semibold tracking-tight bg-transparent text-foreground w-full min-w-0 rounded-lg px-2 py-1 pr-9 placeholder:text-subtle-foreground focus:outline-none transition-colors',
                isEditable && 'hover:bg-muted/60 focus:bg-muted focus:ring-2 focus:ring-accent-soft cursor-text'
              )}
              placeholder="Untitled note"
            />
            {isEditable && (
              <Pencil
                aria-hidden
                className="absolute right-2.5 w-4 h-4 text-subtle-foreground opacity-60 group-hover:opacity-100 group-focus-within:opacity-0 transition-opacity pointer-events-none"
              />
            )}
          </label>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {canCollaborate && <AwarenessCursors awareness={awareness} />}
            {canCollaborate && (
              <span
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
                  status === 'connected' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', status === 'connected' ? 'bg-success' : 'bg-warning animate-pulse')} />
                {status === 'connected' ? 'Live' : 'Reconnecting'}
              </span>
            )}
            <ShareMenu
              visibility={note.visibility}
              editPermission={note.editPermission}
              canChange={canManage}
              onChange={changeSharing}
            />
            <button
              onClick={() => setDigestOpen(true)}
              disabled={!ai?.available}
              title={aiHint}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Summarise
            </button>
            {!canCollaborate && isEditable && (
              <span
                className={cn('text-xs w-14 text-right', saveState === 'failed' ? 'text-danger' : 'text-muted-foreground')}
                aria-live="polite"
              >
                {saveState === 'saving' ? 'Saving…' : saveState === 'failed' ? 'Not saved' : 'Saved'}
              </span>
            )}
          </div>
        </div>

        {isEditable ? (
          <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar -mx-2" role="toolbar" aria-label="Formatting">
            <ToolButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className="w-4 h-4" />
            </ToolButton>
            <ToolButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="w-4 h-4" />
            </ToolButton>
            <span className="w-px h-4 bg-border mx-1.5" />
            <ToolButton
              label="Heading 1"
              active={editor.isActive('heading', { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <Heading1 className="w-4 h-4" />
            </ToolButton>
            <ToolButton
              label="Heading 2"
              active={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="w-4 h-4" />
            </ToolButton>
            <span className="w-px h-4 bg-border mx-1.5" />
            <ToolButton label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List className="w-4 h-4" />
            </ToolButton>
            <ToolButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className="w-4 h-4" />
            </ToolButton>
            <ToolButton label="Checklist" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}>
              <CheckSquare className="w-4 h-4" />
            </ToolButton>
            <ToolButton label="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
              <Code className="w-4 h-4" />
            </ToolButton>

            {canWriteModule && (
              <button
                onClick={() => sendSelectionToBoard(editor)}
                className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-accent hover:bg-accent-soft transition-colors"
                title="Turn the selected text into a task on this module's board"
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Selection to board
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {canWriteModule ? 'Only the author can edit this note.' : 'You can read this note; viewers cannot edit.'}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto cursor-text px-6 md:px-10 py-6">
        <EditorContent editor={editor} className="w-full max-w-3xl" />
      </div>

      <SendToBoardModal
        isOpen={!!boardItems}
        onClose={() => setBoardItems(null)}
        moduleId={moduleId}
        noteTitle={note.title}
        items={boardItems ?? []}
      />

      <NoteDigestPanel
        open={digestOpen}
        onClose={() => setDigestOpen(false)}
        noteId={note.id}
        noteTitle={note.title}
        moduleId={moduleId}
        canAddTasks={canWriteModule}
      />
    </div>
  );
};
