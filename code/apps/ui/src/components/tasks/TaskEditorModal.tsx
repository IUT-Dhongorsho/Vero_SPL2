import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import type { CreatePersonalTask, WorkItem, WorkPriority, WorkStatus } from '../../services/workService';
import { cn } from '../../utils/cn';

interface TaskEditorModalProps {
  open: boolean;
  task: WorkItem | null;
  defaultStatus?: WorkStatus;
  onClose: () => void;
  onSubmit: (input: TaskEditorInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  /** Project boards pass who a task can go to; personal tasks have no assignee. */
  assignees?: { id: string; name: string }[];
  assigneeId?: string | null;
  defaultAssigneeId?: string | null;
}

export type TaskEditorInput = CreatePersonalTask & { assigneeId?: string | null };

const STATUSES: { id: WorkStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'in_review', label: 'In review' },
  { id: 'done', label: 'Done' },
];

const PRIORITIES: { id: WorkPriority; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
];

/** `datetime-local` needs a local, second-less string — not an ISO one. */
function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export const TaskEditorModal: React.FC<TaskEditorModalProps> = ({
  open,
  task,
  defaultStatus = 'backlog',
  onClose,
  onSubmit,
  onDelete,
  assignees,
  assigneeId: currentAssignee,
  defaultAssigneeId = null,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<WorkStatus>(defaultStatus);
  const [priority, setPriority] = useState<WorkPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState('');
  const [saving, setSaving] = useState(false);
  const [assignee, setAssignee] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setStatus((task?.status as WorkStatus) ?? defaultStatus);
    setPriority((task?.priority as WorkPriority) ?? 'medium');
    setDueDate(toLocalInput(task?.dueDate));
    setLabels((task?.labels ?? []).join(', '));
    setSaving(false);
    setAssignee((task ? currentAssignee : defaultAssigneeId) ?? '');
  }, [open, task, defaultStatus, currentAssignee, defaultAssigneeId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        labels: labels
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean),
        ...(assignees ? { assigneeId: assignee || null } : {}),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/70 backdrop-blur-sm z-[90]"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            role="dialog"
            aria-modal
            className="fixed left-1/2 -translate-x-1/2 top-[8vh] w-[min(94vw,36rem)] max-h-[84vh] overflow-y-auto surface-elevated rounded-2xl z-[91]"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-elevated">
              <h3 className="text-lg font-semibold text-foreground">
                {task ? 'Edit task' : 'New task'}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Title</label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="What needs doing?"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-subtle-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Any detail worth remembering…"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-subtle-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-all resize-y leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STATUSES.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => setStatus(entry.id)}
                      className={cn(
                        'px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer',
                        status === entry.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Priority</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRIORITIES.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => setPriority(entry.id)}
                      className={cn(
                        'px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer',
                        priority === entry.id
                          ? 'bg-accent text-accent-foreground border-accent'
                          : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>

              {assignees && (
                <div>
                  <label htmlFor="task-assignee" className="block text-sm font-medium text-foreground mb-2">
                    Assignee
                  </label>
                  <select
                    id="task-assignee"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-all"
                  >
                    <option value="">Nobody yet</option>
                    {assignees.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1.5">They get a notification and see it on their Progress board.</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Due</label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Labels</label>
                  <input
                    value={labels}
                    onChange={(e) => setLabels(e.target.value)}
                    placeholder="research, urgent"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-subtle-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border sticky bottom-0 bg-elevated">
              {task && onDelete ? (
                <AnimatedButton
                  variant="ghost"
                  onClick={async () => {
                    await onDelete(task.id);
                    onClose();
                  }}
                  className="text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </AnimatedButton>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                <AnimatedButton variant="secondary" onClick={onClose}>
                  Cancel
                </AnimatedButton>
                <AnimatedButton
                  variant="primary"
                  onClick={submit}
                  loading={saving}
                  disabled={!title.trim()}
                >
                  {task ? 'Save' : 'Create task'}
                </AnimatedButton>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
