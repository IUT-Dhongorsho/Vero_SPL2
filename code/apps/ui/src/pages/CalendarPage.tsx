import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Circle,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Badge, PriorityBadge } from '../components/ui/Badge';
import { TaskEditorModal } from '../components/tasks/TaskEditorModal';
import { toast } from '../components/Providers/ToastProvider';
import { useWorkStore } from '../stores/work.store';
import type { WorkItem } from '../services/workService';
import { fadeUp, stagger } from '../lib/motion';
import { cn } from '../utils/cn';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

const priorityDot: Record<string, string> = {
  urgent: 'bg-danger',
  high: 'bg-danger',
  medium: 'bg-warning',
  low: 'bg-success',
};

export const CalendarPage: React.FC = () => {
  const { projectTasks, personalTasks, loading, load, move, createPersonal, updatePersonal, deletePersonal } =
    useWorkStore();

  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [creatingOn, setCreatingOn] = useState<Date | null>(null);
  const [editing, setEditing] = useState<WorkItem | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  /** Every dated item, bucketed by day so the grid is a single lookup. */
  const byDay = useMemo(() => {
    const map = new Map<string, WorkItem[]>();
    for (const task of [...projectTasks, ...personalTasks]) {
      if (!task.dueDate) continue;
      const date = new Date(task.dueDate);
      if (Number.isNaN(date.getTime())) continue;
      const key = dateKey(date);
      map.set(key, [...(map.get(key) ?? []), task]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    }
    return map;
  }, [projectTasks, personalTasks]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const today = new Date();

  const grid = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date; inMonth: boolean }[] = [];

    // Lead-in from the previous month keeps the grid rectangular.
    for (let i = firstWeekday - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(year, month, day), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ date: new Date(year, month + 1, cells.length - firstWeekday - daysInMonth + 1), inMonth: false });
    }

    return cells;
  }, [year, month]);

  const selectedTasks = byDay.get(dateKey(selected)) ?? [];

  const upcoming = useMemo(() => {
    const now = Date.now();
    return [...projectTasks, ...personalTasks]
      .filter((t) => t.dueDate && t.status !== 'done' && new Date(t.dueDate).getTime() >= now)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 6);
  }, [projectTasks, personalTasks]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <PageContainer
      title="Calendar"
      subtitle="Every deadline on your plate"
      topBarActions={
        <AnimatedButton size="sm" variant="accent" onClick={() => setCreatingOn(selected)}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add deadline</span>
        </AnimatedButton>
      }
    >
      <motion.div variants={stagger()} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="w-10 h-10 rounded-xl border border-border grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-semibold tracking-tight text-foreground min-w-[11rem] text-center">
              {monthLabel}
            </h2>
            <button
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="w-10 h-10 rounded-xl border border-border grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <AnimatedButton
            size="sm"
            variant="secondary"
            onClick={() => {
              setCursor(new Date());
              setSelected(new Date());
            }}
          >
            Today
          </AnimatedButton>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <motion.section variants={fadeUp} className="lg:col-span-2 surface rounded-2xl p-4 md:p-5">
            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-2xs font-semibold uppercase tracking-wider text-subtle-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {grid.map(({ date, inMonth }) => {
                const tasks = byDay.get(dateKey(date)) ?? [];
                const open = tasks.filter((t) => t.status !== 'done');
                const isSelected = isSameDay(date, selected);
                const isToday = isSameDay(date, today);

                return (
                  <motion.button
                    key={date.toISOString()}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelected(date)}
                    onDoubleClick={() => setCreatingOn(date)}
                    className={cn(
                      'relative aspect-square md:aspect-[1/0.92] rounded-xl p-2 flex flex-col items-start text-left transition-colors cursor-pointer border',
                      inMonth ? 'bg-card' : 'bg-transparent',
                      isSelected
                        ? 'border-accent ring-2 ring-accent-soft'
                        : 'border-border hover:border-border-strong'
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-medium tabular-nums w-6 h-6 grid place-items-center rounded-full',
                        !inMonth && 'text-subtle-foreground',
                        isToday && 'bg-primary text-primary-foreground',
                        inMonth && !isToday && 'text-foreground'
                      )}
                    >
                      {date.getDate()}
                    </span>

                    {tasks.length > 0 && (
                      <span className="mt-auto flex flex-wrap gap-1 w-full">
                        {tasks.slice(0, 3).map((task) => (
                          <span
                            key={task.id}
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              task.status === 'done'
                                ? 'bg-subtle-foreground'
                                : priorityDot[task.priority] ?? 'bg-muted-foreground'
                            )}
                          />
                        ))}
                        {tasks.length > 3 && (
                          <span className="text-2xs text-subtle-foreground leading-none">
                            +{tasks.length - 3}
                          </span>
                        )}
                      </span>
                    )}

                    {open.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 text-2xs font-semibold text-accent tabular-nums">
                        {open.length}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.section>

          <motion.aside variants={fadeUp} className="space-y-6">
            <section className="surface rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {selected.toLocaleDateString(undefined, { weekday: 'long' })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selected.toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setCreatingOn(selected)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
                  aria-label="Add a deadline on this day"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {loading && selectedTasks.length === 0 ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl skeleton-shimmer" />
                  ))}
                </div>
              ) : selectedTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="w-8 h-8 text-subtle-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nothing due this day.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence initial={false}>
                    {selectedTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-xl border border-border p-3 flex items-start gap-3"
                      >
                        <button
                          onClick={async () => {
                            try {
                              await move(task.id, task.status === 'done' ? 'backlog' : 'done');
                            } catch {
                              toast.error('Could not update that task');
                            }
                          }}
                          className="mt-0.5 shrink-0 cursor-pointer"
                          aria-label="Toggle completion"
                        >
                          {task.status === 'done' ? (
                            <CheckCircle2 className="w-4.5 h-4.5 text-success" />
                          ) : (
                            <Circle className="w-4.5 h-4.5 text-muted-foreground hover:text-foreground transition-colors" />
                          )}
                        </button>

                        <button
                          onClick={() => task.source === 'personal' && setEditing(task)}
                          className="flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <p
                            className={cn(
                              'text-sm font-medium text-foreground leading-snug',
                              task.status === 'done' && 'line-through text-muted-foreground'
                            )}
                          >
                            {task.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <PriorityBadge priority={task.priority} />
                            <Badge tone={task.source === 'project' ? 'info' : 'neutral'}>
                              {task.source === 'project' ? task.projectName : 'Personal'}
                            </Badge>
                            <span className="text-2xs text-subtle-foreground tabular-nums">
                              {new Date(task.dueDate!).toLocaleTimeString(undefined, {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>

            <section className="surface rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-foreground mb-1">Coming up</h3>
              <p className="text-sm text-muted-foreground mb-4">The next six deadlines.</p>

              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nothing scheduled ahead.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((task) => {
                    const due = new Date(task.dueDate!);
                    return (
                      <button
                        key={task.id}
                        onClick={() => {
                          setSelected(due);
                          setCursor(new Date(due.getFullYear(), due.getMonth(), 1));
                        }}
                        className="w-full flex items-center gap-3 text-left group cursor-pointer"
                      >
                        <span className="w-11 shrink-0 text-center">
                          <span className="block text-2xs uppercase tracking-wider text-subtle-foreground">
                            {due.toLocaleDateString(undefined, { month: 'short' })}
                          </span>
                          <span className="block text-lg font-semibold text-foreground tabular-nums leading-tight">
                            {due.getDate()}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
                            {task.title}
                          </span>
                          <span className="block text-xs text-muted-foreground truncate">
                            {task.source === 'project' ? task.projectName : 'Personal'}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </motion.aside>
        </div>
      </motion.div>

      <TaskEditorModal
        open={Boolean(creatingOn) || Boolean(editing)}
        task={editing}
        onClose={() => {
          setCreatingOn(null);
          setEditing(null);
        }}
        onSubmit={async (input) => {
          if (editing) {
            await updatePersonal(editing.id, input);
            toast.success('Deadline updated');
          } else {
            // Default the due date to the day the user clicked on.
            const fallback = creatingOn ? new Date(creatingOn) : new Date();
            fallback.setHours(12, 0, 0, 0);
            await createPersonal({ ...input, dueDate: input.dueDate ?? fallback.toISOString() });
            toast.success('Added to your calendar');
          }
        }}
        onDelete={async (id) => {
          await deletePersonal(id);
          toast.success('Deleted');
        }}
      />
    </PageContainer>
  );
};
