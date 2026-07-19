import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/Layout/PageContainer';
import { FolderKanban, Plus, Clock, Users, ArrowRight, ArrowLeft, Shield } from 'lucide-react';
import { useModuleStore } from '../stores/module.store';
import { useProjectStore } from '../stores/project.store';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { toast } from '../components/Providers/ToastProvider';
import { motion } from 'framer-motion';
import { CreateModuleModal } from '../components/modals/CreateModuleModal';

export const ProjectPage: React.FC = () => {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const { modules, fetchModules } = useModuleStore();
  const { projects, fetchProjects } = useProjectStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const project = projects.find(p => p.id === projectId);

  useEffect(() => {
    if (projects.length === 0) {
      fetchProjects();
    }
    if (projectId) {
      fetchModules(projectId);
    }
  }, [projectId, fetchModules, fetchProjects, projects.length]);

  return (
    <PageContainer title="Project Modules">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <AnimatedButton variant="outline" size="sm" onClick={() => navigate('/projects')} className="mb-4 text-muted-foreground border-transparent hover:bg-muted">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
            </AnimatedButton>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">{project?.name || 'Project Modules'}</h1>
            <p className="text-muted-foreground text-lg">{project?.description || 'Manage the specific sub-projects (modules) within this project.'}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            {project?.inviteCode ? (
              <div 
                onClick={() => {
                  navigator.clipboard.writeText(project.inviteCode!);
                  toast.success('Invite code copied!');
                }}
                className="bg-muted px-4 py-2 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors border border-border flex items-center gap-2"
                title="Click to copy invite code"
              >
                <span className="text-sm font-medium text-muted-foreground">Invite Code:</span>
                <span className="font-mono font-bold text-primary tracking-wider">{project.inviteCode}</span>
              </div>
            ) : project?.userRole === 'admin' ? (
              <AnimatedButton 
                variant="outline" 
                onClick={async () => {
                  if (projectId) {
                    try {
                      await useProjectStore.getState().generateInviteCode(projectId);
                      toast.success('Invite code generated!');
                    } catch (e) {
                      toast.error('Failed to generate invite code.');
                    }
                  }
                }}
              >
                Generate Invite Code
              </AnimatedButton>
            ) : null}
            <AnimatedButton variant="primary" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Module
            </AnimatedButton>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/project/${projectId}/module/${mod.id}`)}
              className="group bg-card hover:bg-muted/30 border border-border rounded-xl p-4 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 flex-grow">
                <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0">
                  <FolderKanban className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{mod.name}</h3>
                  <p className="text-sm text-muted-foreground">{mod.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 shrink-0 w-full md:w-auto justify-between md:justify-end mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-border">
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide whitespace-nowrap ${
                  mod.status === 'on-track' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  mod.status === 'at-risk' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {mod.status.replace('-', ' ')}
                </span>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <Shield className="w-4 h-4" /> {mod.members} Members
                </div>
                
                <ArrowRight className="hidden md:block w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      <CreateModuleModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        projectId={projectId!}
      />
    </PageContainer>
  );
};
