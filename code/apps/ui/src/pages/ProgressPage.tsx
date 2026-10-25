import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, LayoutGrid, ListTodo, Plus, RefreshCw } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { StatTile } from '../components/ui/StatTile';
import { EmptyState } from '../components/ui/EmptyState';
import { KanbanBoard, type KanbanCard } from '../components/board/KanbanBoard';
import { TaskEditorModal } from '../components/tasks/TaskEditorModal';
import { WorkViewSwitch, useWorkLinks } from '../components/tasks/WorkViewSwitch';
import { toast } from '../components/Providers/ToastProvider';
import { useWorkStore } from '../stores/work.store';
import { WORK_COLUMNS, type WorkItem, type WorkStatus } from '../services/workService';
import { fadeUp, stagger } from '../lib/motion';
import { cn } from '../utils/cn';

type Scope = 'all' | 'project' | 'personal';

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'project', label: 'Assigned to me' },
  { id: 'personal', label: 'My own tasks' },
];

export const ProgressPage: React.FC = () => {
  const { projectTasks, personalTasks, stats, loading, error, load, loadStats, move, createPersonal, updatePersonal, deletePersonal } =
    useWorkStore();

  const [scope, setScope] = useState<Scope>('all');
  const [editing, setEditing] = useState<WorkItem | null>(null);
  const [creatingIn, setCreatingIn] = useState<WorkStatus | null>(null);

  useEffect(() => {
    load();
    loadStats();
  }, [load, loadStats]);

  const cards: KanbanCard[] = useMemo(() => {
    const source =
      scope === 'project' ? projectTasks : scope === 'personal' ? personalTasks : [...projectTasks, ...personalTasks];

    return source.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      labels: task.labels,
      context: task.source === 'project' ? task.projectName : 'Personal',
    }));
  }, [scope, projectTasks, personalTasks]);

  const handleMove = async (cardId: string, toStatus: string) => {
    try {
      await move(cardId, toStatus as WorkStatus);
    } catch {
      toast.error('Could not move that task');
    }
  };

  const openTask = useWorkLinks({
    projectTasks,
    personalTasks,
    loading,
    onOpen: setEditing,
    onCreate: () => setCreatingIn('backlog'),
  });

  // Project tasks are owned by their board, so they open there.
  const openCard = (card: KanbanCard) => {
    const task = [...personalTasks, ...projectTasks].find((t) => t.id === card.id);
    if (task) openTask(task);
  };

  const totalOnPlate = projectTasks.length + personalTasks.length;
  const doneCount = [...projectTasks, ...personalTasks].filter((t) => t.status === 'done').length;

  return (
    <PageContainer
      title="My work"
      subtitle="Your own tasks and everything assigned to you"
      topBarActions={
        <AnimatedButton size="sm" variant="accent" onClick={() => setCreatingIn('backlog')}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New task</span>
        </AnimatedButton>
      }
    >
      <motion.div variants={stagger()} initial="hidden" animate="show" className="space-y-6">
        <WorkViewSwitch />

        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile
            label="On your plate"
            value={totalOnPlate}
            icon={LayoutGrid}
            tone="accent"
            hint={`${projectTasks.length} assigned, ${personalTasks.length} personal.`}
          />
          <StatTile
            label="In progress"
            value={stats?.assignedInProgress ?? 0}
            icon={ListTodo}
            hint="Project tasks you have picked up."
          />
          <StatTile
            label="Completed"
            value={doneCount}
            icon={CheckCircle2}
            tone="success"
            hint="Across both project and personal work."
          />
          <StatTile
            label="Overdue"
            value={stats?.assignedOverdue ?? 0}
            icon={AlertTriangle}
            tone={stats?.assignedOverdue ? 'danger' : 'neutral'}
            hint="Past the due date and not done."
          />
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-muted">
            {SCOPES.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setScope(entry.id)}
                className={cn(
                  'relative px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                  scope === entry.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {scope === entry.id && (
                  <motion.span
                    layoutId="progress-scope"
                    className="absolute inset-0 rounded-lg bg-card shadow-soft"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">{entry.label}</span>
              </button>
            ))}
          </div>

          <AnimatedButton
            size="sm"
            variant="ghost"
            onClick={() => {
              load();
              loadStats();
            }}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </AnimatedButton>
        </motion.div>

        {error && (
          <motion.div variants={fadeUp} className="surface rounded-2xl p-5 border-danger/40">
            <p className="text-sm text-danger font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check that the board service is running on port 8002.
            </p>
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          {loading && cards.length === 0 ? (
            <div className="flex gap-4 overflow-hidden">
              {WORK_COLUMNS.map((column) => (
                <div key={column.id} className="w-[290px] shrink-0 space-y-2.5">
                  <div className="h-6 w-28 rounded-lg skeleton-shimmer" />
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-xl skeleton-shimmer" />
                  ))}
                </div>
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="surface rounded-2xl">
              <EmptyState
                type="tasks"
                title="Nothing here yet"
                description="Tasks assigned to you on any project board show up here automatically. You can also add your own."
                actionLabel="Add a task"
                onAction={() => setCreatingIn('backlog')}
              />
            </div>
          ) : (
            <KanbanBoard
              columns={WORK_COLUMNS}
              cards={cards}
              onMove={handleMove}
              onCardClick={openCard}
              onAdd={(status) => setCreatingIn(status as WorkStatus)}
              emptyHint="Drag a card here"
            />
          )}
        </motion.div>
      </motion.div>

      <TaskEditorModal
        open={Boolean(editing) || Boolean(creatingIn)}
        task={editing}
        defaultStatus={creatingIn ?? 'backlog'}
        onClose={() => {
          setEditing(null);
          setCreatingIn(null);
        }}
        onSubmit={async (input) => {
          if (editing) {
            await updatePersonal(editing.id, input);
            toast.success('Task updated');
          } else {
            await createPersonal(input);
            toast.success('Task created');
          }
          loadStats();
        }}
        onDelete={async (id) => {
          await deletePersonal(id);
          toast.success('Task deleted');
          loadStats();
        }}
      />
    </PageContainer>
  );
};
