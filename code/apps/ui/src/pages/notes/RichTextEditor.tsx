import React, { useCallback, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Code, CheckSquare, LayoutDashboard, Globe, Lock } from 'lucide-react';
import { useNotesStore } from '../../stores/notes.store';
import { useAuthStore } from '../../stores/auth.store';
import { toast } from '../../components/Providers/ToastProvider';
import { useYjs } from '../../hooks/useYjs';
import { AwarenessCursors } from '../../components/notes/AwarenessCursors';
import { SendToBoardModal } from '../../components/notes/SendToBoardModal';
import type { Note } from '../../../../packages/shared/src/types/notes.types';
import { useParams } from 'react-router-dom';

interface RichTextEditorProps {
  note: Note;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ note }) => {
  const canCollaborate = note.visibility === 'public' && note.editPermission === 'editable';
  const { ydoc, provider, status, awareness } = useYjs({
    documentId: note.id,
    enabled: canCollaborate,
  });

  if (canCollaborate && (!ydoc || !provider)) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground animate-pulse">Connecting to live collaboration...</div>;
  }

  return <RichTextEditorCore 
    key={ydoc?.clientID || note.id}
    note={note} 
    ydoc={ydoc} 
    provider={provider} 
    status={status} 
    awareness={awareness} 
    canCollaborate={canCollaborate} 
  />;
};

interface RichTextEditorCoreProps {
  note: Note;
  ydoc: any;
  provider: any;
  status: string;
  awareness: any;
  canCollaborate: boolean;
}

const RichTextEditorCore: React.FC<RichTextEditorCoreProps> = ({ note, ydoc, provider, status, awareness, canCollaborate }) => {
  const { updateNoteMeta, updateNoteContent } = useNotesStore();
  const { user } = useAuthStore();
  const { projectId } = useParams();
  
  const [title, setTitle] = useState(note.title);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [contentSaveTimeout, setContentSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  const isCreator = note.creatorId === user?.id;
  const isEditable = canCollaborate || isCreator;

  useEffect(() => {
    setTitle(note.title);
  }, [note.id, note.title]);

  const handleMetaSave = useCallback((newTitle: string) => {
    if (!isCreator) return;
    setIsSaving(true);
    if (saveTimeout) clearTimeout(saveTimeout);
    const timeout = setTimeout(async () => {
      try {
        await updateNoteMeta(note.id, { title: newTitle });
      } catch (e) {
        console.error('Failed to update meta', e);
      } finally {
        setIsSaving(false);
      }
    }, 1000);
    setSaveTimeout(timeout);
  }, [note.id, isCreator, updateNoteMeta, saveTimeout]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ 
        history: canCollaborate ? false : undefined,
        heading: { levels: [1, 2, 3] } 
      }),
      Placeholder.configure({ placeholder: "Start writing..." }),
      TaskList,
      TaskItem.configure({ nested: true }),
      ...(canCollaborate && ydoc && provider ? [
        Collaboration.configure({ document: ydoc }),
        CollaborationCursor.configure({ provider, user: { name: user?.name || 'Anonymous', color: '#5B5BD6' } })
      ] : []),
    ],
    content: canCollaborate ? undefined : note.contentSnapshot,
    editable: isEditable,
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[500px] w-full text-foreground marker:text-foreground prose-p:text-foreground prose-headings:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-primary prose-table:border-collapse prose-th:border prose-th:border-border prose-th:p-2 prose-td:border prose-td:border-border prose-td:p-2',
      },
    },
    onUpdate: ({ editor }) => {
      if (!canCollaborate) {
        setIsSaving(true);
        if (contentSaveTimeout) clearTimeout(contentSaveTimeout);
        const timeout = setTimeout(async () => {
          try {
            await updateNoteContent(note.id, editor.getHTML());
          } catch (e) {
            console.error('Failed to save note content', e);
          } finally {
            setIsSaving(false);
          }
        }, 1000);
        setContentSaveTimeout(timeout);
      }
    },
  }, [note.id, canCollaborate, ydoc, provider, isEditable]);


  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    handleMetaSave(newTitle);
  };

  const convertToKanbanTask = () => {
    if (!editor) return;
    const { state } = editor;
    const { selection } = state;
    const text = state.doc.textBetween(selection.from, selection.to, ' ');
    if (!text) {
      toast.error('Select some text first');
      return;
    }
    setSelectedText(text);
    setShowBoardModal(true);
  };

  const handleTogglePrivacy = async () => {
    if (!isCreator) return;
    const newVisibility = note.visibility === 'private' ? 'public' : 'private';
    try {
      await updateNoteMeta(note.id, { visibility: newVisibility });
      toast.success(`Note is now ${newVisibility}`);
    } catch (e) {
      toast.error('Failed to change visibility');
    }
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="px-8 md:px-12 pt-8 pb-4 border-b border-border bg-card/90 backdrop-blur z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            disabled={!isCreator}
            className="text-3xl font-bold bg-transparent text-foreground focus:outline-none w-full placeholder:text-muted-foreground disabled:opacity-80"
            placeholder="Untitled Note"
          />
          <div className="flex items-center gap-4 shrink-0 ml-4">
            {canCollaborate && (
              <AwarenessCursors awareness={awareness} />
            )}
            
            {status === 'connected' && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live
              </span>
            )}

            <button
              onClick={handleTogglePrivacy}
              disabled={!isCreator}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${note.visibility === 'private' ? 'bg-muted border-border text-muted-foreground hover:bg-muted/80' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'} disabled:cursor-not-allowed`}
              title={note.visibility === 'private' ? "Make Public" : "Make Private"}
            >
              {note.visibility === 'private' ? (
                <><Lock className="w-3.5 h-3.5" /> Private</>
              ) : (
                <><Globe className="w-3.5 h-3.5" /> Public</>
              )}
            </button>
            <span className={`text-xs font-medium transition-opacity duration-300 ${isSaving ? 'text-muted-foreground opacity-100' : 'text-emerald-500 opacity-70'}`}>
              {isSaving ? 'Saving...' : 'Saved'}
            </span>
          </div>
        </div>
        
        {isEditable && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded hover:bg-muted ${editor.isActive('bold') ? 'bg-muted text-primary' : 'text-muted-foreground'}`} title="Bold">
              <Bold className="w-4 h-4" />
            </button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded hover:bg-muted ${editor.isActive('italic') ? 'bg-muted text-primary' : 'text-muted-foreground'}`} title="Italic">
              <Italic className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border mx-2" />
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2 rounded hover:bg-muted flex items-center gap-1 text-xs font-semibold ${editor.isActive('heading', { level: 1 }) ? 'bg-muted text-primary' : 'text-muted-foreground'}`} title="Heading 1">
              <Heading1 className="w-4 h-4" /> H1
            </button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded hover:bg-muted flex items-center gap-1 text-xs font-semibold ${editor.isActive('heading', { level: 2 }) ? 'bg-muted text-primary' : 'text-muted-foreground'}`} title="Heading 2">
              <Heading2 className="w-4 h-4" /> H2
            </button>
            <div className="w-px h-4 bg-border mx-2" />
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded hover:bg-muted ${editor.isActive('bulletList') ? 'bg-muted text-primary' : 'text-muted-foreground'}`} title="Bullet List">
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-2 rounded hover:bg-muted ${editor.isActive('orderedList') ? 'bg-muted text-primary' : 'text-muted-foreground'}`} title="Numbered List">
              <ListOrdered className="w-4 h-4" />
            </button>
            <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-2 rounded hover:bg-muted ${editor.isActive('taskList') ? 'bg-muted text-primary' : 'text-muted-foreground'}`} title="Checklist">
              <CheckSquare className="w-4 h-4" />
            </button>
            <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`p-2 rounded hover:bg-muted ${editor.isActive('codeBlock') ? 'bg-muted text-primary' : 'text-muted-foreground'}`} title="Code Block">
              <Code className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-border mx-2" />
            
            <button 
              onClick={convertToKanbanTask} 
              className="p-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors ml-auto" 
              title="Convert selected text to Kanban Task"
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Send to Board
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto cursor-text px-8 md:px-12 py-6">
        <EditorContent editor={editor} className="w-full" />
      </div>

      {showBoardModal && (
        <SendToBoardModal
          isOpen={showBoardModal}
          onClose={() => setShowBoardModal(false)}
          selectedText={selectedText}
          noteId={note.id}
          projectId={projectId}
        />
      )}
    </div>
  );
};
