import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MoreVertical, Trash2, Copy, FileText, Calendar } from 'lucide-react';
import { Note } from './NotesPage';
import { formatDate } from '../../utils/dateUtils';

interface DocumentListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onDuplicateNote: (note: Note) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onDeleteNote,
  onDuplicateNote,
  searchQuery,
  onSearchChange,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  return (
    <div className="w-80 glass rounded-xl flex flex-col">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 glass rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {notes.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No notes found</p>
          </div>
        ) : (
          notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`relative group rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                selectedNoteId === note.id
                  ? 'bg-blue-500/20 border border-blue-500/50'
                  : 'hover:bg-white/20'
              }`}
              onClick={() => onSelectNote(note)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1 line-clamp-1">
                    {note.title}
                  </h4>
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
                  <AnimatePresence>
                    {activeMenuId === note.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 mt-1 w-32 glass rounded-lg shadow-lg overflow-hidden z-10"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateNote(note);
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
                            onDeleteNote(note.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-white/20 transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
