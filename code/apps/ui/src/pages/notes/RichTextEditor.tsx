import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading1, Heading2, Code, CheckSquare, ArrowLeft } from 'lucide-react';
import { Note } from './NotesPage';
import { toast } from '../../components/ui/Toast';
import { useNavigate } from 'react-router-dom';

// Simple lowlight setup for code syntax highlighting (basic version)
const lowlight = {
  listLanguages: () => ['javascript', 'typescript', 'python', 'html', 'css'],
  highlight: (code: string, language: string) => {
    return `<pre><code class="language-${language}">${code}</code></pre>`;
  },
};

interface RichTextEditorProps {
  note: Note;
  onUpdate: (note: Note) => void;
  projectId: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  note,
  onUpdate,
  projectId,
}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(note.title);
  const [isSaving, setIsSaving] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Type "/" for commands...',
      }),
      Underline,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight: lowlight as any,
        HTMLAttributes: {
          class: 'bg-gray-100 dark:bg-gray-800 p-4 rounded-lg font-mono text-sm',
        },
      }),
    ],
    content: note.content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[500px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      handleSave(editor.getHTML());
    },
  });

  const handleSave = useCallback(async (content: string) => {
    setIsSaving(true);
    const updatedNote = {
      ...note,
      title,
      content,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedNote);
    
    setTimeout(() => {
      setIsSaving(false);
    }, 500);
  }, [note, title, onUpdate]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    const updatedNote = {
      ...note,
      title: e.target.value,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedNote);
  };

  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor?.chain().focus().toggleUnderline().run();
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run();
  const toggleTaskList = () => editor?.chain().focus().toggleTaskList().run();
  const setHeading1 = () => editor?.chain().focus().toggleHeading({ level: 1 }).run();
  const setHeading2 = () => editor?.chain().focus().toggleHeading({ level: 2 }).run();
  const toggleCodeBlock = () => editor?.chain().focus().toggleCodeBlock().run();

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/') {
        const { from } = editor.state.selection;
        const coords = editor.view.coordsAtPos(from);
        setSlashMenuPosition({ x: coords.left, y: coords.bottom });
        setShowSlashMenu(true);
        event.preventDefault();
      }
    };

    editor.view.dom.addEventListener('keydown', handleKeyDown);
    return () => editor.view.dom.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  const insertTask = () => {
    editor?.chain().focus().insertContent('<p><input type="checkbox"> New task</p>').run();
    setShowSlashMenu(false);
  };

  const insertHeading = () => {
    editor?.chain().focus().toggleHeading({ level: 2 }).run();
    setShowSlashMenu(false);
  };

  const insertCodeBlock = () => {
    editor?.chain().focus().toggleCodeBlock().run();
    setShowSlashMenu(false);
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden flex flex-col h-full">
      {/* Title Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="flex-1 text-xl font-semibold bg-transparent focus:outline-none"
            placeholder="Untitled Note"
          />
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-gray-400">Saving...</span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-1">
        <button
          onClick={toggleBold}
          className={`p-2 rounded hover:bg-white/20 transition-colors ${editor?.isActive('bold') ? 'bg-blue-500/20 text-blue-500' : ''}`}
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={toggleItalic}
          className={`p-2 rounded hover:bg-white/20 transition-colors ${editor?.isActive('italic') ? 'bg-blue-500/20 text-blue-500' : ''}`}
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={toggleUnderline}
          className={`p-2 rounded hover:bg-white/20 transition-colors ${editor?.isActive('underline') ? 'bg-blue-500/20 text-blue-500' : ''}`}
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button
          onClick={setHeading1}
          className={`p-2 rounded hover:bg-white/20 transition-colors text-xs font-bold ${editor?.isActive('heading', { level: 1 }) ? 'bg-blue-500/20 text-blue-500' : ''}`}
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          onClick={setHeading2}
          className={`p-2 rounded hover:bg-white/20 transition-colors text-xs font-bold ${editor?.isActive('heading', { level: 2 }) ? 'bg-blue-500/20 text-blue-500' : ''}`}
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button
          onClick={toggleBulletList}
          className={`p-2 rounded hover:bg-white/20 transition-colors ${editor?.isActive('bulletList') ? 'bg-blue-500/20 text-blue-500' : ''}`}
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={toggleOrderedList}
          className={`p-2 rounded hover:bg-white/20 transition-colors ${editor?.isActive('orderedList') ? 'bg-blue-500/20 text-blue-500' : ''}`}
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          onClick={toggleTaskList}
          className={`p-2 rounded hover:bg-white/20 transition-colors ${editor?.isActive('taskList') ? 'bg-blue-500/20 text-blue-500' : ''}`}
        >
          <CheckSquare className="w-4 h-4" />
        </button>
        <button
          onClick={toggleCodeBlock}
          className={`p-2 rounded hover:bg-white/20 transition-colors ${editor?.isActive('codeBlock') ? 'bg-blue-500/20 text-blue-500' : ''}`}
        >
          <Code className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Slash Command Menu */}
      {showSlashMenu && (
        <>
          <div
            className="fixed glass rounded-lg shadow-lg overflow-hidden z-50"
            style={{ top: slashMenuPosition.y, left: slashMenuPosition.x }}
          >
            <button
              onClick={insertTask}
              className="w-full text-left px-4 py-2 text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              Task list
            </button>
            <button
              onClick={insertHeading}
              className="w-full text-left px-4 py-2 text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <Heading1 className="w-4 h-4" />
              Heading
            </button>
            <button
              onClick={insertCodeBlock}
              className="w-full text-left px-4 py-2 text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <Code className="w-4 h-4" />
              Code block
            </button>
          </div>
          <div className="fixed inset-0 z-40" onClick={() => setShowSlashMenu(false)} />
        </>
      )}
    </div>
  );
};
