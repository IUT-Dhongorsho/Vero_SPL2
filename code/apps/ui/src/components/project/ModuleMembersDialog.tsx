import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { AnimatedButton } from '../ui/AnimatedButton';
import { inputClass } from '../ui/Field';
import { toast } from '../Providers/ToastProvider';
import { projectService, type ProjectMember } from '../../services/projectService';
import { moduleService, type ModuleDetail } from '../../services/moduleService';
import { errorMessage } from '../../utils/errors';
import { cn } from '../../utils/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  module: ModuleDetail;
  onChanged: () => Promise<void>;
}

/**
 * Admins choose who works on a module from the project's members. Saving
 * applies only the difference, and module chat access follows on the server.
 */
export const ModuleMembersDialog: React.FC<Props> = ({ open, onClose, module, onChanged }) => {
  const [people, setPeople] = useState<ProjectMember[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);

  const current = useMemo(() => new Set(module.members.map((m) => m.userId)), [module.members]);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(current));
    setFilter('');
    projectService
      .getMembers(module.projectId)
      .then(setPeople)
      .catch((error) => {
        toast.error(errorMessage(error, 'Could not load the project’s members'));
        setPeople([]);
      });
  }, [open, module.projectId, current]);

  const visible = (people ?? []).filter((p) => p.user.name.toLowerCase().includes(filter.trim().toLowerCase()));
  const toAdd = [...selected].filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !selected.has(id));

  const toggle = (userId: string) =>
    setSelected((set) => {
      const next = new Set(set);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      if (toAdd.length) await moduleService.addMembers(module.id, toAdd);
      for (const userId of toRemove) await moduleService.removeMember(module.id, userId);
      await onChanged();
      toast.success('Module members updated');
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not update the members'));
    } finally {
      setSaving(false);
    }
  };

  const changes = toAdd.length + toRemove.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Who works on ${module.name}`}
      description="Members see this module in their work and can use its chat. Anyone on the project can still open its board and notes."
      footer={
        <>
          <AnimatedButton variant="secondary" onClick={onClose}>
            Cancel
          </AnimatedButton>
          <AnimatedButton variant="primary" onClick={save} loading={saving} disabled={changes === 0}>
            {changes === 0 ? 'No changes' : `Save ${changes} ${changes === 1 ? 'change' : 'changes'}`}
          </AnimatedButton>
        </>
      }
    >
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Find a project member"
          aria-label="Find a project member"
          className={cn(inputClass, 'pl-9 py-2 text-sm')}
        />
      </div>

      {people === null ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      ) : (
        <ul className="space-y-1 max-h-80 overflow-y-auto -mx-2">
          {visible.map((person) => {
            const on = selected.has(person.userId);
            return (
              <li key={person.userId}>
                <button
                  onClick={() => toggle(person.userId)}
                  aria-pressed={on}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <Avatar name={person.user.name} src={person.user.avatarUrl} size="sm" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">{person.user.name}</span>
                    <span className="block text-xs text-muted-foreground capitalize">{person.role}</span>
                  </span>
                  <span
                    className={cn(
                      'w-5 h-5 rounded-md border grid place-items-center transition-colors',
                      on ? 'bg-accent border-accent text-accent-foreground' : 'border-border-strong'
                    )}
                  >
                    {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  </span>
                </button>
              </li>
            );
          })}
          {visible.length === 0 && <li className="px-2 py-6 text-center text-sm text-muted-foreground">Nobody matches “{filter}”.</li>}
        </ul>
      )}
    </Modal>
  );
};
