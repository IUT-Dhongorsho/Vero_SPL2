import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, Eye, Lock, Users } from 'lucide-react';
import type { NoteEditPermission, NoteVisibility } from '../../../../../packages/shared/src/types/notes.types';
import { cn } from '../../utils/cn';

type Sharing = 'private' | 'view' | 'edit';

const OPTIONS: { id: Sharing; label: string; hint: string; icon: typeof Lock }[] = [
  { id: 'private', label: 'Only you', hint: 'Nobody else can open it', icon: Lock },
  { id: 'view', label: 'Module can view', hint: 'Everyone on the module can read it', icon: Eye },
  { id: 'edit', label: 'Module can edit', hint: 'Everyone on the module writes in it live', icon: Users },
];

export function sharingOf(visibility: NoteVisibility, editPermission: NoteEditPermission): Sharing {
  if (visibility === 'private') return 'private';
  return editPermission === 'editable' ? 'edit' : 'view';
}

interface Props {
  visibility: NoteVisibility;
  editPermission: NoteEditPermission;
  /** Only the author changes sharing; others just see it. */
  canChange: boolean;
  onChange: (next: { visibility: NoteVisibility; editPermission: NoteEditPermission }) => void;
}

export const ShareMenu: React.FC<Props> = ({ visibility, editPermission, canChange, onChange }) => {
  const current = OPTIONS.find((o) => o.id === sharingOf(visibility, editPermission))!;
  const Icon = current.icon;

  const trigger = (
    <span className="flex items-center gap-1.5 h-8 px-3 rounded-full border border-border bg-card text-xs font-medium text-foreground">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      {current.label}
      {canChange && <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
    </span>
  );

  if (!canChange) return <span title="Only the author can change who sees this note">{trigger}</span>;

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button aria-label={`Sharing: ${current.label}`} className="rounded-full hover:bg-muted transition-colors">
          {trigger}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-[90] w-64 surface-elevated rounded-xl p-1.5">
          {OPTIONS.map((option) => (
            <DropdownMenu.Item
              key={option.id}
              onSelect={() =>
                onChange({
                  visibility: option.id === 'private' ? 'private' : 'public',
                  editPermission: option.id === 'view' ? 'read-only' : 'editable',
                })
              }
              className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg outline-none cursor-pointer data-[highlighted]:bg-muted"
            >
              <option.icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <span className="flex-1">
                <span className="block text-sm font-medium text-foreground">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.hint}</span>
              </span>
              <Check className={cn('w-4 h-4 mt-0.5 text-accent', option.id !== current.id && 'invisible')} />
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
