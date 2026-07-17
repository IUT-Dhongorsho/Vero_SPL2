import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageContainer } from '../components/Layout/PageContainer';
import { FolderKanban, Plus, Clock, Users, ArrowRight, Activity, FolderOpen } from 'lucide-react';
import { useProjectStore } from '../stores/project.store';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { CreateProjectModal } from '../components/modals/CreateProjectModal';
import { motion } from 'framer-motion';

export const WorkspacePage: React.FC = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { projects, fetchProjects, loading } = useProjectStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <PageContainer title="All Projects">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Projects</h1>
            <p className="text-muted-foreground text-lg">Manage all active initiatives in this workspace.</p>
          </div>
          <AnimatedButton variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Project
          </AnimatedButton>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
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
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/workspace/${workspaceId}/project/${project.id}`)}
                className="group bg-card hover:bg-muted/30 border border-border rounded-2xl p-6 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    project.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    project.status === 'review' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {project.status.toUpperCase()}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-foreground mb-2">{project.name}</h3>
                <p className="text-sm text-muted-foreground mb-6 line-clamp-2 h-10">{project.description}</p>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-foreground">Task Completion</span>
                      <span className="text-muted-foreground">65%</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full w-[65%]" />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-border">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {project.members}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {project.lastActive}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchProjects} 
      />
    </PageContainer>
  );
};
