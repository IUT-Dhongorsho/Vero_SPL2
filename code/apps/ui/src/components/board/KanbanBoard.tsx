import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { useBoardStore } from '../../stores/board.store';
import { useAuthStore } from '../../stores/auth.store';
import { useProjectStore } from '../../stores/project.store';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../Providers/ToastProvider';
import type { Task } from '../../services/taskService';

export const KanbanBoard: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { columns, tasks, loading, initialized, fetchBoard, createColumn, moveTask } = useBoardStore();
  const { user } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    if (projects.length === 0) fetchProjects();
  }, [projects.length, fetchProjects]);

  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      fetchBoard(projectId, project ? { name: project.name, description: project.description, ownerId: user?.id } : undefined);
    }
  }, [projectId, fetchBoard, projects, user?.id]);

  const handleAddColumn = async () => {
    if (!newColumnName.trim() || !projectId) return;
    try {
      await createColumn(newColumnName.trim(), projectId);
      setNewColumnName('');
      setIsAddingColumn(false);
      toast.success('Column created');
    } catch (e) {
      toast.error('Failed to create column');
    }
  };

  const findColumnByTaskId = (taskId: string) => {
    return columns.find(col =>
      tasks.some(t => t.id === taskId && t.columnId === col.id)
    );
  };

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  }, [tasks]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumnByTaskId(activeId);
    // over could be a task or a column
    let overColumn = columns.find(c => c.id === overId);
    if (!overColumn) {
      overColumn = findColumnByTaskId(overId);
    }

    if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) return;

    // Move task to the new column optimistically
    const task = tasks.find(t => t.id === activeId);
    if (!task) return;

    const colTasks = tasks.filter(t => t.columnId === overColumn!.id);
    const newOrder = colTasks.length;

    const store = useBoardStore.getState();
    const prevTasks = store.tasks;
    const updated = prevTasks.map(t =>
      t.id === activeId ? { ...t, columnId: overColumn!.id, order: newOrder } : t
    );
    useBoardStore.setState({ tasks: updated });
  }, [columns, tasks]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const task = tasks.find(t => t.id === activeId);
    if (!task) return;

    let targetColumnId = task.columnId;
    let targetOrder = task.order;

    // If dropped on another task, put it at that task's position
    const overTask = tasks.find(t => t.id === overId);
    if (overTask) {
      targetColumnId = overTask.columnId;
      targetOrder = overTask.order;
    } else {
      // Dropped on a column directly
      const overColumn = columns.find(c => c.id === overId);
      if (overColumn) {
        targetColumnId = overColumn.id;
        const colTasks = tasks.filter(t => t.columnId === overColumn.id && t.id !== activeId);
        targetOrder = colTasks.length;
      }
    }

    // If nothing changed, skip
    if (task.columnId === targetColumnId && task.order === targetOrder) return;

    try {
      await moveTask(activeId, { columnId: targetColumnId, order: targetOrder });
    } catch (e) {
      toast.error('Failed to move task');
    }
  }, [tasks, columns, moveTask]);

  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Loading board...</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex gap-5 overflow-x-auto pb-4 min-h-[calc(100vh-12rem)] items-start"
      >
        {columns
          .sort((a, b) => a.order - b.order)
          .map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasks
                .filter((t) => t.columnId === column.id)
                .sort((a, b) => a.order - b.order)}
              userId={user?.id || ''}
            />
          ))}

        {/* Add Column */}
        <div className="flex-shrink-0 w-72">
          <AnimatePresence mode="wait">
            {isAddingColumn ? (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-card border border-border rounded-xl p-3.5 shadow-sm"
              >
                <input
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn();
                    if (e.key === 'Escape') {
                      setNewColumnName('');
                      setIsAddingColumn(false);
                    }
                  }}
                  placeholder="Column name..."
                  className="w-full text-sm font-medium text-foreground bg-transparent focus:outline-none placeholder:text-muted-foreground mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddColumn}
                    disabled={!newColumnName.trim()}
                    className="flex-1 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40"
                  >
                    Add Column
                  </button>
                  <button
                    onClick={() => {
                      setNewColumnName('');
                      setIsAddingColumn(false);
                    }}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setIsAddingColumn(true)}
                className="w-full flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl border border-dashed border-border transition-all"
              >
                <Plus className="w-4 h-4" /> Add Column
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-90 rotate-3 scale-105">
            <TaskCard task={activeTask} isDragOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
