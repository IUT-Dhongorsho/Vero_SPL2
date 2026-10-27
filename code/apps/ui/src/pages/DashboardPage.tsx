import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FolderOpen,
  Inbox,
  LayoutGrid,
  Plus,
  Timer,
} from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Badge, PriorityBadge } from '../components/ui/Badge';
import { UnreadWidget } from '../components/dashboard/UnreadWidget';
import { dueMeta } from '../components/board/KanbanBoard';
import { useAuthStore } from '../stores/auth.store';
import { useProjectStore } from '../stores/project.store';
import { useWorkStore } from '../stores/work.store';
import { useInboxStore } from '../stores/inbox.store';
import { fadeUp, hoverLift, stagger } from '../lib/motion';
import { taskHref } from '../lib/routes';
import { cn } from '../utils/cn';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { projects, fetchProjects } = useProjectStore();
  const { projectTasks, personalTasks, stats, loading, load, loadStats } = useWorkStore();
  const incomingRequests = useInboxStore((state) => state.connections.incoming);
  const unread = useInboxStore((state) => state.totalUnread());

  useEffect(() => {
    fetchProjects();
    load();
    loadStats();
  }, [fetchProjects, load, loadStats]);

  const upNext = useMemo(() => {
    return [...projectTasks, ...personalTasks]
      .filter((task) => task.status !== 'done')
      .sort((a, b) => {
        const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return dueA - dueB;
      })
      .slice(0, 5);
  }, [projectTasks, personalTasks]);

  const openCount = projectTasks.concat(personalTasks).filter((t) => t.status !== 'done').length;
  const overdue = stats?.assignedOverdue ?? 0;

  return (
    <PageContainer
      title="Home"
      subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      topBarActions={
        <AnimatedButton size="sm" variant="accent" onClick={() => navigate('/work?new=1')}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add task</span>
        </AnimatedButton>
      }
    >
      <motion.div variants={stagger()} initial="hidden" animate="show" className="space-y-7">
        <motion.header variants={fadeUp}>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            {greeting()}
            {user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            {openCount === 0
              ? 'Nothing is waiting on you right now.'
              : `You have ${openCount} open ${openCount === 1 ? 'task' : 'tasks'} across ${
                  projects.length || 'your'
                } ${projects.length === 1 ? 'project' : 'projects'}.`}
            {overdue > 0 && (
              <>
                {' '}
                <button onClick={() => navigate('/work')} className="text-danger font-medium hover:underline cursor-pointer">
                  {overdue} {overdue === 1 ? 'is' : 'are'} overdue.
                </button>
              </>
            )}
            {unread > 0 && (
              <>
                {' '}
                <button onClick={() => navigate('/inbox')} className="text-foreground font-medium hover:underline cursor-pointer">
                  {unread} unread {unread === 1 ? 'message' : 'messages'} in your Inbox.
                </button>
              </>
            )}
          </p>
        </motion.header>

        {incomingRequests.length > 0 && (
          <motion.button
            variants={fadeUp}
            onClick={() => navigate('/inbox')}
            className="w-full surface rounded-2xl p-5 flex items-center gap-4 text-left hover:border-border-strong transition-colors cursor-pointer"
          >
            <span className="w-11 h-11 rounded-xl bg-accent-soft text-accent grid place-items-center shrink-0">
              <Inbox className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-medium text-foreground">
                {incomingRequests.length} connection{' '}
                {incomingRequests.length === 1 ? 'request' : 'requests'} waiting
              </span>
              <span className="block text-sm text-muted-foreground truncate">
                {incomingRequests.map((c) => c.user.name).join(', ')}
              </span>
            </span>
            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </motion.button>
        )}

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Up next */}
          <motion.section variants={fadeUp} className="lg:col-span-2 surface rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-accent-soft text-accent grid place-items-center">
                  <Clock className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">Up next</h3>
                  <p className="text-sm text-muted-foreground">Sorted by due date</p>
                </div>
              </div>
            </div>

            {loading && upNext.length === 0 ? (
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl skeleton-shimmer" />
                ))}
              </div>
            ) : upNext.length === 0 ? (
              <div className="flex-1 grid place-items-center py-10 text-center">
                <div>
                  <CheckCircle2 className="w-9 h-9 text-success mx-auto mb-3" />
                  <p className="font-medium text-foreground">All caught up</p>
                  <p className="text-sm text-muted-foreground mt-1">Nothing is due right now.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 flex-1">
                {upNext.map((task) => {
                  const due = dueMeta(task.dueDate);
                  return (
                    <button
                      key={task.id}
                      onClick={() => navigate(taskHref(task))}
                      className="w-full text-left rounded-xl border border-border p-3.5 hover:border-border-strong hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <p className="font-medium text-foreground leading-snug line-clamp-1">
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <PriorityBadge priority={task.priority} />
                        {due && <Badge tone={due.tone}>{due.label}</Badge>}
                        <Badge tone={task.source === 'project' ? 'info' : 'neutral'}>
                          {task.source === 'project' ? task.projectName : 'Personal'}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => navigate('/work')}
              className="mt-5 text-sm font-medium text-accent hover:underline text-left cursor-pointer"
            >
              See all my work
            </button>
          </motion.section>

          {/* Unread messages */}
          <motion.div variants={fadeUp} className="lg:col-span-3">
            <UnreadWidget />
          </motion.div>
        </div>

        {/* Projects */}
        <motion.section variants={fadeUp}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-accent-soft text-accent grid place-items-center">
                <LayoutGrid className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  Pick up where you left off
                </h3>
                <p className="text-sm text-muted-foreground">Your most recent projects</p>
              </div>
            </div>
            <AnimatedButton size="sm" variant="ghost" onClick={() => navigate('/projects')}>
              See all
              <ArrowRight className="w-4 h-4" />
            </AnimatedButton>
          </div>

          {projects.length === 0 ? (
            <div className="surface rounded-2xl p-10 text-center">
              <FolderOpen className="w-9 h-9 text-subtle-foreground mx-auto mb-4" />
              <p className="font-medium text-foreground mb-1.5">No projects yet</p>
              <p className="text-sm text-muted-foreground mb-5">
                Create one to start organising your work.
              </p>
              <AnimatedButton variant="primary" onClick={() => navigate('/projects')}>
                Go to Projects
              </AnimatedButton>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.slice(0, 3).map((project) => (
                <motion.button
                  key={project.id}
                  {...hoverLift}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className={cn(
                    'group surface rounded-2xl p-5 text-left cursor-pointer hover:border-border-strong transition-colors'
                  )}
                >
                  <span className="w-10 h-10 rounded-xl bg-muted text-foreground grid place-items-center mb-4">
                    <FolderOpen className="w-5 h-5" />
                  </span>
                  <p className="font-semibold text-foreground mb-1.5 line-clamp-1">{project.name}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {project.description || 'No description yet.'}
                  </p>
                </motion.button>
              ))}
            </div>
          )}
        </motion.section>

        <motion.p variants={fadeUp} className="text-xs text-subtle-foreground flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5" />
          Time on site is tracked from presence heartbeats — see the breakdown on your{' '}
          <button
            onClick={() => navigate('/profile')}
            className="underline hover:text-foreground transition-colors cursor-pointer"
          >
            profile
          </button>
          .
        </motion.p>
      </motion.div>
    </PageContainer>
  );
};
