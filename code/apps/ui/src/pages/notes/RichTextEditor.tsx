import React, { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading1, Heading2, ArrowLeft } from 'lucide-react';
import { Note } from './NotesPage';
import { toast } from '../../components/Providers/ToastProvider';
import { useNavigate } from 'react-router-dom';

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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your note here...',
      }),
      Underline,
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
  const setHeading1 = () => editor?.chain().focus().toggleHeading({ level: 1 }).run();
  const setHeading2 = () => editor?.chain().focus().toggleHeading({ level: 2 }).run();

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
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={toggleItalic}
          className={`p-2 rounded hover:bg-white/20 transition-colors ${editor?.isActive('italic') ? 'bg-blue-500/20 text-blue-500' : ''}`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={toggleUnderline}
          className={`p-2 rounded hover:bg-white/20 transition-colors ${editor?.isActive('underline') ? 'bg-blue-500/20 text-blue-500' : ''}`}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button
          onClick={setHeading1}
          className={`p-2 rounded hover:bg-white/20 transition-colors ${editor?.isActive('heading', { level: 1 }) ? 'bg-blue-500/20 text-blue-500' : ''}`}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          onClick={setHeading2}
          className={`p-2 rounded hover:bg-white/20 transition-colors ${editor?.isActive('heading', { level: 2 }) ? 'bg-blue-500/20 text-blue-500' : ''}`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button
          onClick={toggleBulletList}
          className={`p-2 rounded hover:bg-white/20 transition-colors ${editor?.isActive('bulletList') ? 'bg-blue-500/20 text-blue-500' : ''}`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={toggleOrderedList}
          className={`p-2 rounded hover:bg-white/20 transition-colors ${editor?.isActive('orderedList') ? 'bg-blue-500/20 text-blue-500' : ''}`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
