import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, FolderKanban, KeyRound, Plus, Search, Users } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { CreateProjectModal } from '../components/modals/CreateProjectModal';
import { JoinProjectModal } from '../components/modals/JoinProjectModal';
import { useProjectStore } from '../stores/project.store';
import { fadeUp, hoverLift, stagger } from '../lib/motion';

export const WorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, fetchProjects, loading } = useProjectStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(term) ||
        (project.description ?? '').toLowerCase().includes(term)
    );
  }, [projects, search]);

  return (
    <PageContainer
      title="Projects"
      subtitle={`${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`}
      topBarActions={
        <div className="flex items-center gap-2">
          <AnimatedButton size="sm" variant="secondary" onClick={() => setJoinOpen(true)}>
            <KeyRound className="w-4 h-4" />
            <span className="hidden sm:inline">Join</span>
          </AnimatedButton>
          <AnimatedButton size="sm" variant="accent" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New project</span>
          </AnimatedButton>
        </div>
      }
    >
      <motion.div variants={stagger()} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={fadeUp} className="relative max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-subtle-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-all"
          />
        </motion.div>

        {loading && projects.length === 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 rounded-2xl skeleton-shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div variants={fadeUp} className="surface rounded-2xl">
            <EmptyState
              type="projects"
              title={search ? 'No matches' : 'No projects yet'}
              description={
                search
                  ? `Nothing matches “${search}”.`
                  : 'Create a project to organise your work, or join one with an invite code.'
              }
              actionLabel={search ? undefined : 'Create a project'}
              onAction={search ? undefined : () => setCreateOpen(true)}
            />
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((project) => (
              <motion.article
                key={project.id}
                variants={fadeUp}
                {...hoverLift}
                onClick={() => navigate(`/project/${project.id}`)}
                className="group surface rounded-2xl p-6 cursor-pointer hover:border-border-strong transition-colors flex flex-col"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span className="w-11 h-11 rounded-xl bg-accent-soft text-accent grid place-items-center shrink-0">
                    <FolderKanban className="w-5 h-5" />
                  </span>
                  <Badge tone={project.status === 'completed' ? 'neutral' : 'success'} dot>
                    {project.status === 'completed' ? 'Completed' : 'Active'}
                  </Badge>
                </div>

                <h3 className="text-lg font-semibold tracking-tight text-foreground mb-2 line-clamp-1">
                  {project.name}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">
                  {project.description || 'No description yet.'}
                </p>

                <div className="flex items-center justify-between pt-5 mt-5 border-t border-border">
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    {project.memberCount ?? 1}
                    <span className="hidden sm:inline">
                      {(project.memberCount ?? 1) === 1 ? 'member' : 'members'}
                    </span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground group-hover:text-accent transition-colors">
                    Open
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </motion.div>

      <CreateProjectModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinProjectModal isOpen={joinOpen} onClose={() => setJoinOpen(false)} />
    </PageContainer>
  );
};
