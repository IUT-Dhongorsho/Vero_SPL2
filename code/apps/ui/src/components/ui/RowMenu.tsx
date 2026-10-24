import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface RowMenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
}

/** The "…" menu at the end of a list row. Keyboard and screen-reader ready via Radix. */
export const RowMenu: React.FC<{ items: RowMenuItem[]; label: string }> = ({ items, label }) => {
  const visible = items.filter((i) => !i.hidden);
  if (visible.length === 0) return null;
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted data-[state=open]:bg-muted data-[state=open]:text-foreground transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
          className="z-[90] min-w-44 surface-elevated rounded-xl p-1.5 text-sm"
        >
          {visible.map(({ label: itemLabel, icon: Icon, onSelect, danger }) => (
            <DropdownMenu.Item
              key={itemLabel}
              onSelect={onSelect}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg outline-none cursor-pointer select-none',
                danger ? 'text-danger data-[highlighted]:bg-danger-soft' : 'text-foreground data-[highlighted]:bg-muted'
              )}
            >
              <Icon className="w-4 h-4" />
              {itemLabel}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
