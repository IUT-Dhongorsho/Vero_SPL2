import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, FolderKanban, Plus } from 'lucide-react';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { ListSkeleton } from '../../components/ui/Skeleton';
import { CreateModuleModal } from '../../components/modals/CreateModuleModal';
import { ModuleStatusBadge } from '../../components/project/ModuleStatusBadge';
import { AvatarStack } from '../../components/project/AvatarStack';
import { useModuleStore } from '../../stores/module.store';
import type { ProjectTabProps } from './ProjectPage';

export const ModulesTab: React.FC<ProjectTabProps> = ({ project, setActions }) => {
  const navigate = useNavigate();
  const { modules, fetchModules, loading, projectId } = useModuleStore();
  const [creating, setCreating] = useState(false);
  const isAdmin = project.userRole === 'admin';

  useEffect(() => {
    fetchModules(project.id);
  }, [project.id, fetchModules]);

  useEffect(() => {
    setActions(
      isAdmin ? (
        <AnimatedButton size="sm" variant="accent" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New module</span>
        </AnimatedButton>
      ) : null
    );
  }, [isAdmin, setActions]);

  const list = projectId === project.id ? modules : [];

  return (
    <>
      {loading && list.length === 0 ? (
        <ListSkeleton rows={3} />
      ) : list.length === 0 ? (
        <div className="surface rounded-2xl">
          <EmptyState
            type="projects"
            title="No modules yet"
            description={
              isAdmin
                ? 'Split the project into modules — each gets its own board, notes and chat.'
                : 'An admin has not set up any modules in this project yet.'
            }
            actionLabel={isAdmin ? 'Create the first module' : undefined}
            onAction={isAdmin ? () => setCreating(true) : undefined}
          />
        </div>
      ) : (
        <ul className="surface rounded-2xl divide-y divide-border overflow-hidden">
          {list.map((mod) => (
            <li key={mod.id}>
              <button
                onClick={() => navigate(`/project/${project.id}/module/${mod.id}`)}
                className="group w-full text-left flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-5 py-4 hover:bg-muted/60 focus-visible:bg-muted/60 transition-colors"
              >
                <span className="flex items-start gap-4 flex-1 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-muted text-foreground grid place-items-center shrink-0">
                    <FolderKanban className="w-5 h-5" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">{mod.name}</span>
                      {mod.isMember && <Badge tone="accent">Joined</Badge>}
                    </span>
                    <span className="block text-sm text-muted-foreground truncate">
                      {mod.description || 'No description'}
                    </span>
                  </span>
                </span>

                <span className="flex items-center gap-4 pl-14 sm:pl-0 shrink-0">
                  <ModuleStatusBadge status={mod.status} />
                  <AvatarStack people={mod.memberPreview.map((m) => m.user)} total={mod.members} />
                  <ChevronRight className="w-4 h-4 text-subtle-foreground group-hover:text-foreground transition-colors hidden sm:block" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <CreateModuleModal isOpen={creating} onClose={() => setCreating(false)} projectId={project.id} />
    </>
  );
};
