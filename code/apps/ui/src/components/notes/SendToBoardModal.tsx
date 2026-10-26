import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { AnimatedButton } from '../ui/AnimatedButton';
import { PriorityBadge } from '../ui/Badge';
import { toast } from '../Providers/ToastProvider';
import { boardService, type BoardColumn } from '../../services/boardService';
import type { WorkPriority } from '../../services/workService';
import { useAuthStore } from '../../stores/auth.store';
import { errorMessage } from '../../utils/errors';
import { cn } from '../../utils/cn';

export interface DraftTask {
  title: string;
  detail?: string;
  priority?: WorkPriority;
}

interface SendToBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The module whose board receives the tasks. */
  moduleId: string;
  noteTitle: string;
  items: DraftTask[];
}

/**
 * Turns note text — a selection, or the AI's action items — into tasks on the
 * module's board. Every item can be left out before sending.
 */
export const SendToBoardModal: React.FC<SendToBoardModalProps> = ({ isOpen, onClose, moduleId, noteTitle, items }) => {
  const me = useAuthStore((s) => s.user);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [columnId, setColumnId] = useState('');
  const [chosen, setChosen] = useState<boolean[]>([]);
  const [assignToMe, setAssignToMe] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setChosen(items.map(() => true));
    setAssignToMe(false);
    (async () => {
      try {
        let cols = await boardService.columns(moduleId);
        if (cols.length === 0) cols = (await boardService.initialise(moduleId)).columns;
        cols = [...cols].sort((a, b) => a.order - b.order);
        setColumns(cols);
        setColumnId((cols.find((c) => c.name === 'Backlog') ?? cols[0])?.id ?? '');
      } catch (error) {
        toast.error(errorMessage(error, 'Could not load the board'));
      }
    })();
  }, [isOpen, moduleId, items]);

  const selected = items.filter((_, i) => chosen[i]);

  const send = async () => {
    if (!columnId || !me || selected.length === 0) return;
    setSending(true);
    try {
      for (const item of selected) {
        await boardService.createTask({
          title: item.title.length > 200 ? `${item.title.slice(0, 197)}…` : item.title,
          description: [item.detail, `From the note “${noteTitle}”.`].filter(Boolean).join('\n\n'),
          columnId,
          creatorId: me.id,
          assigneeId: assignToMe ? me.id : undefined,
          priority: item.priority ?? 'medium',
        });
      }
      const column = columns.find((c) => c.id === columnId)?.name ?? 'the board';
      toast.success(selected.length === 1 ? `Added to ${column}` : `Added ${selected.length} tasks to ${column}`);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not add the tasks'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={items.length === 1 ? 'Add to the board' : `Add ${items.length} tasks to the board`}
      description="They are created on this module’s board."
      size="lg"
      footer={
        <>
          <AnimatedButton variant="secondary" onClick={onClose}>
            Cancel
          </AnimatedButton>
          <AnimatedButton variant="primary" onClick={send} loading={sending} disabled={!columnId || selected.length === 0}>
            {selected.length === 1 ? 'Add task' : `Add ${selected.length} tasks`}
          </AnimatedButton>
        </>
      }
    >
      <div className="space-y-5">
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i}>
              <button
                onClick={() => items.length > 1 && setChosen((c) => c.map((v, j) => (j === i ? !v : v)))}
                aria-pressed={chosen[i]}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors',
                  chosen[i] ? 'border-border bg-card' : 'border-dashed border-border bg-transparent opacity-60',
                  items.length > 1 && 'hover:border-border-strong'
                )}
              >
                {items.length > 1 && (
                  <span
                    className={cn(
                      'mt-0.5 w-5 h-5 rounded-md border grid place-items-center shrink-0',
                      chosen[i] ? 'bg-accent border-accent text-accent-foreground' : 'border-border-strong'
                    )}
                  >
                    {chosen[i] && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-foreground line-clamp-2">{item.title}</span>
                  {item.detail && <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.detail}</span>}
                </span>
                {item.priority && <PriorityBadge priority={item.priority} />}
              </button>
            </li>
          ))}
        </ul>

        <div>
          <p className="text-sm font-medium text-foreground mb-2">Column</p>
          <div className="flex flex-wrap gap-2">
            {columns.map((col) => (
              <button
                key={col.id}
                onClick={() => setColumnId(col.id)}
                aria-pressed={columnId === col.id}
                className={cn(
                  'text-sm px-3.5 py-2 rounded-lg border transition-colors',
                  columnId === col.id
                    ? 'border-accent bg-accent-soft text-accent font-medium'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {col.name}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
          <input type="checkbox" checked={assignToMe} onChange={(e) => setAssignToMe(e.target.checked)} className="w-4 h-4 accent-[var(--accent)]" />
          Assign them to me
        </label>
      </div>
    </Modal>
  );
};
