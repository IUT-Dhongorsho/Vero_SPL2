import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/Layout/PageContainer';
import { FolderKanban, Plus, Users, ArrowRight, FolderOpen, CheckCircle, Clock } from 'lucide-react';
import { useProjectStore } from '../stores/project.store';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { CreateProjectModal } from '../components/modals/CreateProjectModal';
import { JoinProjectModal } from '../components/modals/JoinProjectModal';
import { motion } from 'framer-motion';

export const WorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, fetchProjects, loading } = useProjectStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const statusConfig = {
    active: { label: 'Active', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: Clock },
    completed: { label: 'Completed', classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: CheckCircle },
  };

  return (
    <PageContainer title="All Projects">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Projects</h1>
            <p className="text-muted-foreground text-lg">All initiatives you are a member of.</p>
          </div>
          <div className="flex items-center gap-3">
            <AnimatedButton variant="ghost" onClick={() => setIsJoinModalOpen(true)}>
              Join via Code
            </AnimatedButton>
            <AnimatedButton variant="primary" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Project
            </AnimatedButton>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24 bg-card border border-border rounded-3xl shadow-sm">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Create your first project to start collaborating with your team.</p>
            <AnimatedButton variant="primary" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Project
            </AnimatedButton>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, i) => {
              const status = statusConfig[project.status as keyof typeof statusConfig] ?? statusConfig.active;
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="group bg-card hover:bg-muted/30 border border-border rounded-2xl p-6 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                      <FolderKanban className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.classes}`}>
                      {status.label}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-2">{project.name}</h3>
                  <p className="text-sm text-muted-foreground mb-6 line-clamp-2 h-10">
                    {project.description || 'No description provided.'}
                  </p>

                  <div className="flex justify-between items-center pt-4 border-t border-border">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Users className="w-3.5 h-3.5" />
                      {project.memberCount ?? 1} member{(project.memberCount ?? 1) !== 1 ? 's' : ''}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <JoinProjectModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
    </PageContainer>
  );
};
