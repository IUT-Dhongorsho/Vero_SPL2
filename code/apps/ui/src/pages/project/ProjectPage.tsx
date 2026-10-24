import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, FolderKanban, Settings2, Users } from 'lucide-react';
import { PageContainer } from '../../components/Layout/PageContainer';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { projectService, type Project } from '../../services/projectService';
import { springSoft } from '../../lib/motion';
import { cn } from '../../utils/cn';
import { ModulesTab } from './ModulesTab';
import { MembersTab } from './MembersTab';
import { FilesTab } from './FilesTab';
import { SettingsTab } from './SettingsTab';

type Tab = 'modules' | 'members' | 'files' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'modules', label: 'Modules', icon: FolderKanban },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'files', label: 'Files', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

export const ROLE_LABEL = { admin: 'Admin', member: 'Member', viewer: 'Viewer' } as const;

export interface ProjectTabProps {
  project: Project;
  /** Reload the project header (counts, name, invite code). */
  refresh: () => Promise<void>;
  /** Where each tab renders its own TopBar actions. */
  setActions: (node: React.ReactNode) => void;
}

export const ProjectPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = (TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'modules') as Tab;

  const [project, setProject] = useState<Project | null>(null);
  const [missing, setMissing] = useState(false);
  const [actions, setActions] = useState<React.ReactNode>(null);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    try {
      setProject(await projectService.getProject(projectId));
      setMissing(false);
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 403) setMissing(true);
    }
  }, [projectId]);

  useEffect(() => {
    setProject(null);
    refresh();
  }, [refresh]);

  const selectTab = (next: Tab) => {
    setActions(null);
    setParams(next === 'modules' ? {} : { tab: next }, { replace: true });
  };

  if (missing) {
    return (
      <PageContainer title="Project">
        <div className="surface rounded-2xl px-6 py-16 text-center max-w-xl mx-auto">
          <h2 className="text-xl font-semibold text-foreground mb-2">This project isn’t available</h2>
          <p className="text-muted-foreground mb-6">It may have been deleted, or you are no longer a member.</p>
          <AnimatedButton variant="primary" onClick={() => navigate('/projects')}>
            Back to projects
          </AnimatedButton>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={project?.name ?? 'Project'}
      subtitle={project ? `${project.memberCount} ${project.memberCount === 1 ? 'member' : 'members'}` : undefined}
      topBarActions={actions}
    >
      <div className="space-y-6">
        <header className="space-y-4">
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All projects
          </Link>

          {project ? (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">{project.name}</h1>
                  <Badge tone={project.status === 'completed' ? 'neutral' : 'success'} dot>
                    {project.status === 'completed' ? 'Completed' : 'Active'}
                  </Badge>
                </div>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  {project.description || 'No description yet.'}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                You are {project.userRole === 'admin' ? 'an' : 'a'}{' '}
                <span className="font-medium text-foreground">{ROLE_LABEL[project.userRole].toLowerCase()}</span>
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <Skeleton width="280px" height="34px" />
              <Skeleton width="420px" height="18px" />
            </div>
          )}

          <nav
            role="tablist"
            aria-label="Project sections"
            className="flex gap-1 border-b border-border overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0"
          >
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectTab(id)}
                  className={cn(
                    'relative flex items-center gap-2 px-3.5 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" strokeWidth={active ? 2.2 : 1.9} />
                  {label}
                  {active && (
                    <motion.span
                      layoutId="project-tab"
                      transition={springSoft}
                      className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-accent"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </header>

        {project && (
          <section role="tabpanel">
            {tab === 'modules' && <ModulesTab project={project} refresh={refresh} setActions={setActions} />}
            {tab === 'members' && <MembersTab project={project} refresh={refresh} setActions={setActions} />}
            {tab === 'files' && <FilesTab project={project} refresh={refresh} setActions={setActions} />}
            {tab === 'settings' && <SettingsTab project={project} refresh={refresh} setActions={setActions} />}
          </section>
        )}
      </div>
    </PageContainer>
  );
};
