import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, GripVertical, Trash2, Pencil, AlertCircle, Clock } from 'lucide-react';
import { Task } from '../../services/taskService';
import { useBoardStore } from '../../stores/board.store';
import { toast } from '../Providers/ToastProvider';
import { TaskEditModal } from './TaskEditModal';

interface TaskCardProps {
  task: Task;
  isDragOverlay?: boolean;
}

const PRIORITY_CONFIG = {
  urgent: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
  high: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle },
  medium: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  low: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: Clock },
};

const formatDate = (dateStr: string | null): string | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, isDragOverlay = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { deleteTask } = useBoardStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const PriorityIcon = priority.icon;
  const dueDateLabel = formatDate(task.dueDate);
  const labels = task.labels?.length ? task.labels.filter(Boolean) : [];

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTask(task.id);
      toast.success('Task deleted');
    } catch (e) {
      toast.error('Failed to delete task');
    }
  };

  return (
    <>
      <motion.div
        ref={setNodeRef}
        style={style}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`group bg-card border border-border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all relative ${
          isDragging ? 'opacity-40' : ''
        } ${isDragOverlay ? 'shadow-2xl ring-2 ring-primary/30' : ''}`}
      >
        {/* Priority + Actions row */}
        <div className="flex items-start justify-between mb-2">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${priority.color}`}>
            <PriorityIcon className="w-3 h-3" />
            {task.priority}
          </span>
          <div className="flex items-center gap-1">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="p-1 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors cursor-grab active:cursor-grabbing"
              title="Drag to move"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Title — clickable to edit */}
        <h4
          className="text-sm font-medium text-foreground mb-1.5 leading-snug cursor-pointer hover:text-primary transition-colors"
          onClick={() => setIsEditing(true)}
        >
          {task.title}
        </h4>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">{task.description}</p>
        )}

        {/* Labels */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {labels.map((label, i) => (
              <span
                key={i}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-1">
          {dueDateLabel ? (
            <span className={`text-[11px] flex items-center gap-1 ${
              dueDateLabel.includes('overdue')
                ? 'text-red-500 font-medium'
                : 'text-muted-foreground'
            }`}>
              <Calendar className="w-3 h-3" />
              {dueDateLabel}
            </span>
          ) : (
            <span />
          )}
        </div>
      </motion.div>

      {isEditing && (
        <TaskEditModal
          task={task}
          onClose={() => setIsEditing(false)}
        />
      )}
    </>
  );
};
