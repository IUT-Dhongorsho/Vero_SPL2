import React, { useEffect } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { KanbanSquare, List } from 'lucide-react';
import type { WorkItem } from '../../services/workService';
import { taskHref } from '../../lib/routes';
import { cn } from '../../utils/cn';

/** My work is one list of tasks, seen either as a list or as a board. */
export const WorkViewSwitch: React.FC = () => (
  <div role="tablist" aria-label="View" className="inline-flex gap-1 p-1 rounded-xl bg-muted">
    {[
      { to: '/work', label: 'List', icon: List },
      { to: '/work/board', label: 'Board', icon: KanbanSquare },
    ].map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        end
        role="tab"
        className={({ isActive }) =>
          cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            isActive ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          )
        }
      >
        <Icon className="w-4 h-4" />
        {label}
      </NavLink>
    ))}
  </div>
);

/**
 * Handles `?task=` and `?new=1`, so links from Home, search and notifications
 * land on the task itself. Personal tasks open here; project tasks open on
 * their own board, where they are edited.
 */
export function useWorkLinks({
  projectTasks,
  personalTasks,
  loading,
  onOpen,
  onCreate,
}: {
  projectTasks: WorkItem[];
  personalTasks: WorkItem[];
  loading: boolean;
  onOpen: (task: WorkItem) => void;
  onCreate: () => void;
}) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const taskId = params.get('task');
  const wantsNew = params.get('new') === '1';

  useEffect(() => {
    if (wantsNew) {
      onCreate();
      setParams({}, { replace: true });
      return;
    }
    if (!taskId || loading) return;
    const personal = personalTasks.find((t) => t.id === taskId);
    const project = projectTasks.find((t) => t.id === taskId);
    // The store starts empty and not loading, so wait for a list to arrive
    // before deciding the task is gone.
    if (!personal && !project && personalTasks.length + projectTasks.length === 0) return;
    setParams({}, { replace: true });
    if (personal) onOpen(personal);
    else if (project) navigate(taskHref(project), { replace: true });
    // The handlers are recreated each render; the ids are what matter here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, wantsNew, loading, personalTasks, projectTasks]);

  /** Where a click on any task goes: the editor here, or its board. */
  return (task: WorkItem) => (task.source === 'personal' ? onOpen(task) : navigate(taskHref(task)));
}
