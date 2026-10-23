import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, UserPlus } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { EmptyState } from '../components/ui/EmptyState';
import { KanbanBoard, type KanbanCard, type KanbanColumnDef } from '../components/board/KanbanBoard';
import { TaskEditorModal } from '../components/tasks/TaskEditorModal';
import { toast } from '../components/Providers/ToastProvider';
import { boardService, type BoardColumn, type BoardTask } from '../services/boardService';
import { useAuthStore } from '../stores/auth.store';
import type { WorkItem } from '../services/workService';
import { fadeUp, stagger } from '../lib/motion';

/** The project kanban for a module. Columns come from board-service. */
export const BoardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const me = useAuthStore((state) => state.user);

  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BoardTask | null>(null);
  const [creatingIn, setCreatingIn] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      let boardColumns = await boardService.columns(projectId);
      // A project that has never been opened has no columns yet.
      if (boardColumns.length === 0) {
        const initialised = await boardService.initialise(projectId);
        boardColumns = initialised.columns;
      }
      const boardTasks = await boardService.tasks(projectId);
      setColumns(boardColumns);
      setTasks(boardTasks);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Could not load this board');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const columnDefs: KanbanColumnDef[] = useMemo(
    () => columns.map((column) => ({ id: column.id, label: column.name })),
    [columns]
  );

  const cards: KanbanCard[] = useMemo(
    () =>
      tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        // On this board the "status" a card sits in *is* its column.
        status: task.columnId,
        priority: task.priority,
        dueDate: task.dueDate,
        labels: task.labels ? task.labels.split(',').filter(Boolean) : [],
        context: task.assigneeId === me?.id ? 'Assigned to you' : null,
      })),
    [tasks, me?.id]
  );

  const handleMove = async (cardId: string, toColumnId: string) => {
    const previous = tasks;
    const targetCount = tasks.filter((t) => t.columnId === toColumnId).length;

    setTasks((current) =>
      current.map((task) => (task.id === cardId ? { ...task, columnId: toColumnId } : task))
    );

    try {
      const updated = await boardService.moveTask(cardId, toColumnId, targetCount);
      setTasks((current) => current.map((task) => (task.id === cardId ? updated : task)));
    } catch {
      setTasks(previous);
      toast.error('Could not move that task');
    }
  };

  /** Bridges the board task shape onto the shared personal-task editor. */
  const asWorkItem = (task: BoardTask | null): WorkItem | null =>
    task
      ? {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          labels: task.labels ? task.labels.split(',').filter(Boolean) : [],
          order: task.order,
          source: 'project',
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        }
      : null;

  return (
    <PageContainer
      title="Board"
      subtitle="Project tasks — assign one to yourself and it shows on your Progress board"
      topBarActions={
        <div className="flex items-center gap-2">
          <AnimatedButton size="sm" variant="ghost" onClick={refresh}>
            <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          </AnimatedButton>
          <AnimatedButton
            size="sm"
            variant="accent"
            onClick={() => setCreatingIn(columns[0]?.id ?? null)}
            disabled={columns.length === 0}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New task</span>
          </AnimatedButton>
        </div>
      }
    >
      <motion.div variants={stagger()} initial="hidden" animate="show" className="space-y-6">
        {error ? (
          <motion.div variants={fadeUp} className="surface rounded-2xl p-6">
            <p className="font-medium text-danger">{error}</p>
            <p className="text-sm text-muted-foreground mt-1.5">
              Check that the board service is running on port 8002.
            </p>
          </motion.div>
        ) : loading && tasks.length === 0 ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[290px] shrink-0 space-y-2.5">
                <div className="h-6 w-28 rounded-lg skeleton-shimmer" />
                <div className="h-32 rounded-xl skeleton-shimmer" />
              </div>
            ))}
          </div>
        ) : columns.length === 0 ? (
          <div className="surface rounded-2xl">
            <EmptyState type="tasks" title="This board has no columns" description="Refresh to set up the default columns." actionLabel="Refresh" onAction={refresh} />
          </div>
        ) : (
          <motion.div variants={fadeUp}>
            <KanbanBoard
              columns={columnDefs}
              cards={cards}
              onMove={handleMove}
              onCardClick={(card) => setEditing(tasks.find((t) => t.id === card.id) ?? null)}
              onAdd={(columnId) => setCreatingIn(columnId)}
            />
          </motion.div>
        )}
      </motion.div>

      <TaskEditorModal
        open={Boolean(editing) || Boolean(creatingIn)}
        task={asWorkItem(editing)}
        onClose={() => {
          setEditing(null);
          setCreatingIn(null);
        }}
        onSubmit={async (input) => {
          try {
            if (editing) {
              const updated = await boardService.updateTask(editing.id, {
                title: input.title,
                description: input.description,
                priority: input.priority,
                dueDate: input.dueDate,
                labels: input.labels,
                status: input.status,
              });
              setTasks((current) => current.map((t) => (t.id === editing.id ? updated : t)));
              toast.success('Task updated');
            } else if (creatingIn && me) {
              const created = await boardService.createTask({
                title: input.title,
                description: input.description,
                columnId: creatingIn,
                creatorId: me.id,
                // New cards default to you, which is what puts them on Progress.
                assigneeId: me.id,
                dueDate: input.dueDate,
                priority: input.priority,
                labels: input.labels,
              });
              setTasks((current) => [...current, created]);
              toast.success('Task created and assigned to you');
            }
          } catch {
            toast.error('Could not save that task');
          }
        }}
        onDelete={async (id) => {
          try {
            await boardService.deleteTask(id);
            setTasks((current) => current.filter((t) => t.id !== id));
            toast.success('Task deleted');
          } catch {
            toast.error('Could not delete that task');
          }
        }}
      />
    </PageContainer>
  );
};

export const BoardAssignIcon = UserPlus;
