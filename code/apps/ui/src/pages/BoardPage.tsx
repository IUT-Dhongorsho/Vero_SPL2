import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
import { projectService, type ProjectMember } from '../services/projectService';
import { useModule } from '../hooks/useModule';
import { errorMessage } from '../utils/errors';
import { moduleCrumbs } from '../lib/routes';
import { fadeUp, stagger } from '../lib/motion';

/** A module's kanban. Each module has its own board in board-service. */
export const BoardPage: React.FC = () => {
  const { projectId, moduleId } = useParams<{ projectId: string; moduleId: string }>();
  const me = useAuthStore((state) => state.user);
  const { module } = useModule(moduleId);
  const [people, setPeople] = useState<ProjectMember[]>([]);
  const readOnly = module?.userRole === 'viewer';

  useEffect(() => {
    if (projectId) projectService.getMembers(projectId).then(setPeople).catch(() => setPeople([]));
  }, [projectId]);

  const nameOf = useCallback((id: string | null) => people.find((p) => p.userId === id)?.user.name ?? null, [people]);

  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BoardTask | null>(null);
  const [creatingIn, setCreatingIn] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!moduleId) return;
    setLoading(true);
    setError(null);
    try {
      let boardColumns = await boardService.columns(moduleId);
      // A module board that has never been opened has no columns yet.
      if (boardColumns.length === 0) {
        const initialised = await boardService.initialise(moduleId);
        boardColumns = initialised.columns;
      }
      const boardTasks = await boardService.tasks(moduleId);
      setColumns(boardColumns);
      setTasks(boardTasks);
    } catch (err: any) {
      setError(errorMessage(err, 'This board could not be loaded'));
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // `?task=` (from Home, My work or a notification) opens that task.
  const [params, setParams] = useSearchParams();
  const linkedTaskId = params.get('task');
  useEffect(() => {
    if (!linkedTaskId || loading) return;
    const task = tasks.find((t) => t.id === linkedTaskId);
    setParams({}, { replace: true });
    if (task) setEditing(task);
    else toast.error('That task is no longer on this board');
  }, [linkedTaskId, loading, tasks, setParams]);

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
        context: task.assigneeId === me?.id ? 'Assigned to you' : task.assigneeId ? `Assigned to ${nameOf(task.assigneeId) ?? 'a teammate'}` : null,
      })),
    [tasks, me?.id, nameOf]
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
      title={module?.name ?? 'Board'}
      crumbs={moduleCrumbs(module)}
      topBarActions={
        <div className="flex items-center gap-2">
          <AnimatedButton size="sm" variant="ghost" onClick={refresh}>
            <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          </AnimatedButton>
          <AnimatedButton
            size="sm"
            variant="accent"
            onClick={() => setCreatingIn(columns[0]?.id ?? null)}
            disabled={columns.length === 0 || readOnly}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New task</span>
          </AnimatedButton>
        </div>
      }
    >
      <motion.div variants={stagger()} initial="hidden" animate="show" className="space-y-6">
        {readOnly && (
          <p className="text-sm text-muted-foreground">
            You are a viewer on this project, so you can read this board but not change it.
          </p>
        )}
        {error ? (
          <motion.div variants={fadeUp} className="surface rounded-2xl p-6">
            <p className="font-medium text-danger">{error}</p>
            <AnimatedButton size="sm" variant="secondary" className="mt-4" onClick={refresh}>
              Try again
            </AnimatedButton>
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
              onMove={readOnly ? () => toast.error('Viewers cannot move tasks') : handleMove}
              onCardClick={(card) => !readOnly && setEditing(tasks.find((t) => t.id === card.id) ?? null)}
              onAdd={(columnId) => !readOnly && setCreatingIn(columnId)}
            />
          </motion.div>
        )}
      </motion.div>

      <TaskEditorModal
        open={Boolean(editing) || Boolean(creatingIn)}
        task={asWorkItem(editing)}
        assignees={people.filter((p) => p.role !== 'viewer').map((p) => ({ id: p.userId, name: p.userId === me?.id ? `${p.user.name} (you)` : p.user.name }))}
        assigneeId={editing?.assigneeId ?? null}
        defaultAssigneeId={me?.id ?? null}
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
                assigneeId: input.assigneeId ?? null,
              });
              setTasks((current) => current.map((t) => (t.id === editing.id ? updated : t)));
              toast.success('Task updated');
            } else if (creatingIn && me) {
              const created = await boardService.createTask({
                title: input.title,
                description: input.description,
                columnId: creatingIn,
                creatorId: me.id,
                assigneeId: input.assigneeId ?? undefined,
                dueDate: input.dueDate,
                priority: input.priority,
                labels: input.labels,
              });
              setTasks((current) => [...current, created]);
              const who = input.assigneeId === me.id ? 'you' : nameOf(input.assigneeId ?? null);
              toast.success(who ? `Task created and assigned to ${who}` : 'Task created');
            }
          } catch (error) {
            toast.error(errorMessage(error, 'Could not save that task'));
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
