import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, GripVertical, Plus } from 'lucide-react';
import { Badge, PriorityBadge } from '../ui/Badge';
import { cn } from '../../utils/cn';
import { EASE_OUT } from '../../lib/motion';

export interface KanbanCard {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  dueDate?: string | null;
  labels?: string[];
  /** Small context line, e.g. the project a task belongs to. */
  context?: string | null;
  /** Cards that cannot be dragged. */
  locked?: boolean;
}

export interface KanbanColumnDef {
  id: string;
  label: string;
}

interface KanbanBoardProps {
  columns: KanbanColumnDef[];
  cards: KanbanCard[];
  onMove: (cardId: string, toStatus: string) => void;
  onCardClick?: (card: KanbanCard) => void;
  onAdd?: (status: string) => void;
  emptyHint?: string;
}

export function dueMeta(dueDate?: string | null) {
  if (!dueDate) return null;

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  // Floor, not round: a deadline at 12:00 today is 0.5 days away and must read
  // as "today", and yesterday at 12:00 must read as overdue. This has to match
  // the bucketing on the Tasks page or a row lands under the wrong heading.
  const days = Math.floor((due.getTime() - startOfToday.getTime()) / 86_400_000);

  if (days < 0) return { label: `${Math.abs(days)}d overdue`, tone: 'danger' as const };
  if (days === 0) return { label: 'Due today', tone: 'warning' as const };
  if (days === 1) return { label: 'Due tomorrow', tone: 'warning' as const };
  if (days <= 7) return { label: `Due in ${days}d`, tone: 'neutral' as const };
  return {
    label: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    tone: 'neutral' as const,
  };
}

const Card: React.FC<{ card: KanbanCard; onClick?: () => void; dragging?: boolean }> = ({
  card,
  onClick,
  dragging,
}) => {
  const due = dueMeta(card.dueDate);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group surface rounded-xl p-4 select-none',
        onClick && 'cursor-pointer',
        dragging && 'shadow-lifted rotate-1'
      )}
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 font-medium text-foreground leading-snug">{card.title}</p>
        {!card.locked && (
          <GripVertical className="w-4 h-4 text-subtle-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
        )}
      </div>

      {card.description && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {card.description}
        </p>
      )}

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={card.priority} />
        {due && (
          <Badge tone={due.tone}>
            <CalendarClock className="w-3 h-3" />
            {due.label}
          </Badge>
        )}
        {card.labels?.slice(0, 2).map((label) => (
          <Badge key={label} tone="neutral">
            {label}
          </Badge>
        ))}
      </div>

      {card.context && (
        <p className="mt-3 pt-3 border-t border-border text-xs text-subtle-foreground truncate">
          {card.context}
        </p>
      )}
    </div>
  );
};

const SortableCard: React.FC<{ card: KanbanCard; onClick?: () => void }> = ({ card, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: card.locked,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && 'opacity-40')}
      {...attributes}
      {...listeners}
    >
      <Card card={card} onClick={onClick} />
    </div>
  );
};

const Column: React.FC<{
  column: KanbanColumnDef;
  cards: KanbanCard[];
  onCardClick?: (card: KanbanCard) => void;
  onAdd?: (status: string) => void;
  emptyHint?: string;
}> = ({ column, cards, onCardClick, onAdd, emptyHint }) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col flex-1 min-w-[260px] shrink-0">
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">{column.label}</h3>
          <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5 tabular-nums">
            {cards.length}
          </span>
        </div>
        {onAdd && (
          <button
            onClick={() => onAdd(column.id)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label={`Add a task to ${column.label}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-2xl p-2.5 space-y-2.5 min-h-[180px] transition-colors duration-200 border border-dashed',
          isOver ? 'bg-accent-soft border-accent' : 'bg-muted/40 border-transparent'
        )}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {cards.map((card) => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
              >
                <SortableCard card={card} onClick={onCardClick ? () => onCardClick(card) : undefined} />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>

        {cards.length === 0 && (
          <p className="text-xs text-subtle-foreground text-center py-8 px-3 leading-relaxed">
            {emptyHint ?? 'Drop a card here'}
          </p>
        )}
      </div>
    </div>
  );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  cards,
  onMove,
  onCardClick,
  onAdd,
  emptyHint,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    // A small threshold keeps click-to-open working alongside drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const byColumn = useMemo(() => {
    const map = new Map<string, KanbanCard[]>(columns.map((c) => [c.id, []]));
    for (const card of cards) {
      const bucket = map.get(card.status) ?? map.get(columns[0]?.id ?? '');
      bucket?.push(card);
    }
    return map;
  }, [cards, columns]);

  const activeCard = cards.find((c) => c.id === activeId) ?? null;

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = String(active.id);
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    // `over` is either a column droppable or another card — resolve both.
    const overId = String(over.id);
    const targetStatus = columns.some((c) => c.id === overId)
      ? overId
      : cards.find((c) => c.id === overId)?.status;

    if (targetStatus && targetStatus !== card.status) {
      onMove(cardId, targetStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            cards={byColumn.get(column.id) ?? []}
            onCardClick={onCardClick}
            onAdd={onAdd}
            emptyHint={emptyHint}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {activeCard ? <Card card={activeCard} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
};
