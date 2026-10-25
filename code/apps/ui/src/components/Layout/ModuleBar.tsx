import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, FolderKanban, LayoutDashboard, MessageSquare, Video, type LucideIcon } from 'lucide-react';
import { useMeetStatus } from '../../hooks/useMeetStatus';
import { moduleHref, type ModuleTool } from '../../lib/routes';
import { springSoft } from '../../lib/motion';
import { cn } from '../../utils/cn';

const TOOLS: { tool?: ModuleTool; label: string; icon: LucideIcon }[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { tool: 'board', label: 'Board', icon: FolderKanban },
  { tool: 'notes', label: 'Notes', icon: FileText },
  { tool: 'chat', label: 'Chat', icon: MessageSquare },
  { tool: 'meet', label: 'Meet', icon: Video },
];

/**
 * The tools of one module, side by side. It belongs to the shell rather than
 * to each page, so it stays put — and its highlight slides — while you move
 * from the board to the notes and back.
 */
export const ModuleBar: React.FC<{ projectId: string; moduleId: string }> = ({ projectId, moduleId }) => {
  const { isLive, liveCount } = useMeetStatus(moduleId);

  return (
    <nav
      aria-label="Module tools"
      className="flex items-center gap-1 h-full overflow-x-auto no-scrollbar px-4 md:px-8"
    >
      {TOOLS.map(({ tool, label, icon: Icon }) => {
        const live = tool === 'meet' && isLive;
        return (
          <NavLink
            key={label}
            to={moduleHref(projectId, moduleId, tool)}
            end={!tool}
            className="relative h-full flex items-center"
          >
            {({ isActive }) => (
              <span
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={isActive ? 2.2 : 1.9} />
                {label}
                {live && (
                  <span
                    className="flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full bg-success-soft text-success text-2xs font-semibold tabular-nums"
                    title={`${liveCount} in the call now`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    {liveCount}
                  </span>
                )}
                {isActive && (
                  <motion.span
                    layoutId="module-bar-active"
                    transition={springSoft}
                    className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-accent"
                  />
                )}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};
