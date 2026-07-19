import React, { useEffect, useState } from 'react';
import type { Awareness } from 'y-protocols/awareness';

interface Collaborator {
  name: string;
  color: string;
  id: string;
}

export const AwarenessCursors: React.FC<{ awareness: Awareness | null }> = ({ awareness }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    if (!awareness) {
      setCollaborators([]);
      return;
    }
    const update = () => {
      const states = Array.from(awareness.getStates().values())
        .filter(s => s.user)
        .map(s => s.user as Collaborator);
      setCollaborators(states);
    };
    awareness.on('change', update);
    update();
    return () => awareness.off('change', update);
  }, [awareness]);

  // Don't show if only the current user is editing (or 0 users)
  if (collaborators.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full text-xs shrink-0">
      <div className="flex -space-x-2 mr-2">
        {collaborators.map(c => (
          <span key={c.id} title={c.name}
            style={{ backgroundColor: c.color }}
            className="w-6 h-6 rounded-full border-2 border-card flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
            {c.name.charAt(0).toUpperCase()}
          </span>
        ))}
      </div>
      <span className="text-muted-foreground font-medium">{collaborators.length} editing</span>
    </div>
  );
};
