import React, { useCallback, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Code, CheckSquare, LayoutDashboard } from 'lucide-react';
import { Note, useNotesStore } from '../../stores/notes.store';
import { toast } from '../../components/Providers/ToastProvider';

interface RichTextEditorProps {
  note: Note;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ note }) => {
  const { updateNote } = useNotesStore();
  const [title, setTitle] = useState(note.title);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTitle(note.title);
  }, [note.id]);

  const handleSave = useCallback((content: string, newTitle: string) => {
    setIsSaving(true);
    if (saveTimeout) clearTimeout(saveTimeout);

    const timeout = setTimeout(() => {
      updateNote({
        ...note,
        title: newTitle,
        content,
        updatedAt: new Date().toISOString(),
      });
      setIsSaving(false);
    }, 1000);
    setSaveTimeout(timeout);
  }, [note, updateNote, saveTimeout]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: note.content,
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[500px] w-full text-foreground marker:text-foreground prose-p:text-foreground prose-headings:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-primary prose-table:border-collapse prose-th:border prose-th:border-border prose-th:p-2 prose-td:border prose-td:border-border prose-td:p-2',
      },
    },
    onUpdate: ({ editor }) => {
      handleSave(editor.getHTML(), title);
    },
  }, [note.id]); 

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (editor) {
      handleSave(editor.getHTML(), newTitle);
    }
  };

  const convertToKanbanTask = () => {
    if (!editor) return;
    
    const { state } = editor;
    const { selection } = state;
    const text = state.doc.textBetween(selection.from, selection.to, ' ') || 'New Task from Note';
    
    toast.success(`Sent to Kanban Board: "${text}"`);
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
            className="text-3xl font-bold bg-transparent text-foreground focus:outline-none w-full placeholder:text-muted-foreground"
            placeholder="Untitled Note"
          />
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <span className={`text-xs font-medium transition-opacity duration-300 ${isSaving ? 'text-muted-foreground opacity-100' : 'text-emerald-500 opacity-70'}`}>
              {isSaving ? 'Saving...' : 'Saved'}
            </span>
          </div>
        </div>
        
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
      </div>

      <div className="flex-1 overflow-y-auto cursor-text px-8 md:px-12 py-6">
        <EditorContent editor={editor} className="w-full" />
      </div>
    </div>
  );
};
