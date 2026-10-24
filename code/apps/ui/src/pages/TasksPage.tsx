import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  Filter,
  Pin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Badge, PriorityBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { TaskEditorModal } from '../components/tasks/TaskEditorModal';
import { dueMeta } from '../components/board/KanbanBoard';
import { BoardPage } from './BoardPage';
import { toast } from '../components/Providers/ToastProvider';
import { useWorkStore } from '../stores/work.store';
import type { WorkItem } from '../services/workService';
import { fadeUp, stagger } from '../lib/motion';
import { cn } from '../utils/cn';

type Bucket = 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later' | 'someday' | 'done';

const BUCKET_ORDER: { id: Bucket; label: string }[] = [
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'thisWeek', label: 'This week' },
  { id: 'later', label: 'Later' },
  { id: 'someday', label: 'No due date' },
  { id: 'done', label: 'Completed' },
];

function bucketFor(task: WorkItem): Bucket {
  if (task.status === 'done') return 'done';
  if (!task.dueDate) return 'someday';

  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return 'someday';

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((due.getTime() - startOfToday.getTime()) / 86_400_000);

  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days <= 7) return 'thisWeek';
  return 'later';
}

const PRIORITY_FILTERS = ['all', 'urgent', 'high', 'medium', 'low'] as const;
type PriorityFilter = (typeof PRIORITY_FILTERS)[number];

const TaskRow: React.FC<{
  task: WorkItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
}> = ({ task, onToggle, onEdit, onDelete, onPin }) => {
  const done = task.status === 'done';
  const due = dueMeta(task.dueDate);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.2 }}
      className="group surface rounded-xl p-4 flex items-start gap-3.5 hover:border-border-strong transition-colors"
    >
      <button
        onClick={onToggle}
        className="mt-0.5 shrink-0 cursor-pointer"
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
      >
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-success" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
        )}
      </button>

      <button onClick={onEdit} className="flex-1 min-w-0 text-left cursor-pointer">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={cn(
              'font-medium text-foreground leading-snug',
              done && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </p>
          {task.pinned && <Pin className="w-3.5 h-3.5 text-accent shrink-0" />}
        </div>

        {task.description && (
          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <PriorityBadge priority={task.priority} />
          {due && !done && (
            <Badge tone={due.tone}>
              <CalendarClock className="w-3 h-3" />
              {due.label}
            </Badge>
          )}
          {task.source === 'project' && <Badge tone="info">{task.projectName}</Badge>}
          {task.labels.map((label) => (
            <Badge key={label}>{label}</Badge>
          ))}
        </div>
      </button>

      {task.source === 'personal' && (
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={onPin}
            title={task.pinned ? 'Unpin' : 'Pin to top'}
            className="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent-soft transition-colors cursor-pointer"
          >
            <Pin className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            title="Delete task"
            className="p-2 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
};

export const TasksPage: React.FC = () => {
  const { projectId, moduleId } = useParams<{ projectId?: string; moduleId?: string }>();

  if (projectId && moduleId) {
    return <BoardPage />;
  }

  return <PersonalTaskList />;
};

const PersonalTaskList: React.FC = () => {
  const {
    projectTasks,
    personalTasks,
    loading,
    error,
    load,
    loadStats,
    createPersonal,
    updatePersonal,
    deletePersonal,
    move,
  } = useWorkStore();

  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<PriorityFilter>('all');
  const [showDone, setShowDone] = useState(false);
  const [includeProject, setIncludeProject] = useState(true);
  const [editing, setEditing] = useState<WorkItem | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
    loadStats();
  }, [load, loadStats]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...personalTasks, ...(includeProject ? projectTasks : [])]
      .filter((task) => (showDone ? true : task.status !== 'done'))
      .filter((task) => (priority === 'all' ? true : task.priority === priority))
      .filter(
        (task) =>
          !term ||
          task.title.toLowerCase().includes(term) ||
          (task.description ?? '').toLowerCase().includes(term)
      );
  }, [personalTasks, projectTasks, includeProject, showDone, priority, search]);

  const grouped = useMemo(() => {
    const map = new Map<Bucket, WorkItem[]>();
    for (const task of filtered) {
      const bucket = bucketFor(task);
      const list = map.get(bucket) ?? [];
      list.push(task);
      map.set(bucket, list);
    }
    return map;
  }, [filtered]);

  return (
    <PageContainer
      title="Tasks"
      subtitle="Everything on your plate across projects and your own list."
      topBarActions={
        <AnimatedButton
          size="sm"
          variant="accent"
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add task
        </AnimatedButton>
      }
    >
      <motion.div initial="initial" animate="animate" variants={stagger()} className="space-y-6">
        {/* Controls */}
        <motion.div
          variants={fadeUp}
          className="surface rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tasks by title or description…"
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-1">
              <span className="text-xs text-muted-foreground px-2 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Priority
              </span>
              {PRIORITY_FILTERS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer',
                    priority === p
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIncludeProject((v) => !v)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer inline-flex items-center gap-1.5',
                includeProject
                  ? 'border-accent text-accent bg-accent-soft'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {includeProject && <Check className="w-3.5 h-3.5" />}
              Project tasks
            </button>

            <button
              onClick={() => setShowDone((v) => !v)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer inline-flex items-center gap-1.5',
                showDone
                  ? 'border-accent text-accent bg-accent-soft'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {showDone && <Check className="w-3.5 h-3.5" />}
              Completed
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.div variants={fadeUp} className="surface rounded-2xl p-5">
            <p className="text-sm text-danger font-medium">{error}</p>
          </motion.div>
        )}

        {loading && filtered.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl skeleton-shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div variants={fadeUp} className="surface rounded-2xl">
            <EmptyState
              type="tasks"
              title={search ? 'No matches' : 'No tasks yet'}
              description={
                search
                  ? `Nothing matches “${search}”.`
                  : 'Add a task of your own, or pick one up on a project board — anything assigned to you lands here too.'
              }
              actionLabel="Add a task"
              onAction={() => setCreating(true)}
            />
          </motion.div>
        ) : (
          BUCKET_ORDER.map(({ id, label }) => {
            const tasks = grouped.get(id);
            if (!tasks?.length) return null;

            return (
              <motion.section key={id} variants={fadeUp}>
                <div className="flex items-center gap-2.5 mb-3 px-1">
                  <h2
                    className={cn(
                      'text-lg font-semibold tracking-tight',
                      id === 'overdue' ? 'text-danger' : 'text-foreground'
                    )}
                  >
                    {label}
                  </h2>
                  <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5 tabular-nums">
                    {tasks.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  <AnimatePresence initial={false}>
                    {tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggle={async () => {
                          try {
                            await move(task.id, task.status === 'done' ? 'backlog' : 'done');
                          } catch {
                            toast.error('Could not update that task');
                          }
                        }}
                        onEdit={() => {
                          if (task.source === 'personal') setEditing(task);
                          else
                            toast.success(
                              `“${task.title}” is managed on the ${task.projectName} board`
                            );
                        }}
                        onDelete={async () => {
                          await deletePersonal(task.id);
                          toast.success('Task deleted');
                        }}
                        onPin={() => updatePersonal(task.id, { pinned: !task.pinned })}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>
            );
          })
        )}
      </motion.div>

      <TaskEditorModal
        open={creating || Boolean(editing)}
        task={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
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
        }}
      />
    </PageContainer>
  );
};
