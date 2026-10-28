import React from 'react';
import { Avatar } from '../ui/Avatar';

interface Person {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

/** Overlapping avatars with a +N for whoever does not fit. */
export const AvatarStack: React.FC<{ people: Person[]; total?: number; max?: number }> = ({ people, total, max = 4 }) => {
  const shown = people.slice(0, max);
  const extra = (total ?? people.length) - shown.length;
  return (
    <span className="flex items-center -space-x-2" aria-label={`${total ?? people.length} people`}>
      {shown.map((p) => (
        <span key={p.id} title={p.name}>
          <Avatar name={p.name} src={p.avatarUrl} size="xs" ring />
        </span>
      ))}
      {extra > 0 && (
        <span className="w-7 h-7 rounded-full bg-muted ring-2 ring-background text-2xs font-semibold text-muted-foreground grid place-items-center">
          +{extra}
        </span>
      )}
    </span>
  );
};
