import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { Column, Task } from '../../services/taskService';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { useBoardStore } from '../../stores/board.store';
import { toast } from '../Providers/ToastProvider';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  userId: string;
}

const COLUMN_DOT_COLORS: Record<string, string> = {
  Backlog: 'bg-muted-foreground',
  'In Progress': 'bg-blue-500',
  'In Review': 'bg-yellow-500',
  Done: 'bg-green-500',
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, tasks, userId }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const { createTask, deleteColumn, updateColumn } = useBoardStore();

  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const taskIds = tasks.map(t => t.id);

  const handleCreateTask = async (data: { title: string; description?: string; priority?: string; dueDate?: string }) => {
    try {
      await createTask({
        title: data.title,
        description: data.description,
        columnId: column.id,
        creatorId: userId,
        priority: (data.priority as any) || 'medium',
        dueDate: data.dueDate,
      });
      setIsCreating(false);
      toast.success('Task created');
    } catch (e) {
      toast.error('Failed to create task');
    }
  };

  const handleDeleteColumn = async () => {
    if (!confirm(`Delete "${column.name}" and all its tasks?`)) return;
    try {
      await deleteColumn(column.id);
      setShowMenu(false);
      toast.success('Column deleted');
    } catch (e) {
      toast.error('Failed to delete column');
    }
  };

  const handleRename = async () => {
    if (editName.trim() && editName !== column.name) {
      try {
        await updateColumn(column.id, { name: editName.trim() });
        setIsEditing(false);
      } catch (e) {
        toast.error('Failed to rename column');
      }
    } else {
      setEditName(column.name);
      setIsEditing(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex-shrink-0 w-72 flex flex-col max-h-[calc(100vh-12rem)] rounded-xl transition-colors ${
        isOver ? 'bg-primary/5 ring-2 ring-primary/30' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${COLUMN_DOT_COLORS[column.name] || 'bg-muted-foreground'}`} />
          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setEditName(column.name);
                  setIsEditing(false);
                }
              }}
              className="text-sm font-semibold text-foreground bg-transparent border-b border-primary focus:outline-none w-32"
            />
          ) : (
            <h3 className="text-sm font-semibold text-foreground">{column.name}</h3>
          )}
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-medium">
            {tasks.length}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Rename
                  </button>
                  <button
                    onClick={handleDeleteColumn}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Task List — Droppable */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[100px]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </AnimatePresence>
        </SortableContext>

        {tasks.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50">
            Drop tasks here
          </div>
        )}
      </div>

      {/* Add Task Button */}
      <div className="mt-3">
        {isCreating ? (
          <TaskModal
            columnId={column.id}
            columnName={column.name}
            onSubmit={handleCreateTask}
            onClose={() => setIsCreating(false)}
          />
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl border border-dashed border-border transition-all"
          >
            <Plus className="w-4 h-4" /> Add task
          </button>
        )}
      </div>
    </motion.div>
  );
};
