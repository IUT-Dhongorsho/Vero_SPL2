import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users, Clock, FolderOpen, LayoutDashboard, FolderKanban, CheckSquare, CalendarDays, Files } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { GlassCard } from '../components/ui/GlassCard';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { CreateProjectModal } from '../components/modals/CreateProjectModal';
import { projectService } from '../services/projectService';

interface Project {
  id: string;
  name: string;
  description: string;
  members: number;
  lastActive: string;
  status: string;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', href: '/dashboard', active: true },
    { icon: <FolderKanban className="w-4 h-4" />, label: 'Projects', href: '/projects' },
    { icon: <CheckSquare className="w-4 h-4" />, label: 'My Tasks', href: '/tasks' },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'Calendar', href: '/calendar' },
    { icon: <Files className="w-4 h-4" />, label: 'Files', href: '/files' },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <PageContainer title="Dashboard" sidebarItems={sidebarItems}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer
        title="Dashboard"
        sidebarItems={sidebarItems}
        topBarActions={
          <div className="flex gap-3 items-center">
            <AnimatedButton variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              New Project
            </AnimatedButton>
            <ThemeToggle />
          </div>
        }
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 rounded-xl p-8 mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, Jane! 🎉</h2>
          <p className="text-gray-700">
            You have {projects.length} active projects. Ready to collaborate?
          </p>
        </motion.div>

        <h3 className="text-xl font-semibold text-gray-900 mb-5">Your Projects</h3>
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No projects yet. Create your first project!</p>
            <AnimatedButton variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Create Project
            </AnimatedButton>
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {projects.map((project) => (
              <motion.div key={project.id} variants={item}>
                <GlassCard onClick={() => navigate(`/project/${project.id}`)}>
                  <div className="flex items-start justify-between mb-3">
                    <FolderOpen className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{project.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{project.description}</p>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <div className="flex gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {project.members}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {project.lastActive}</span>
                    </div>
                    <span className="text-blue-600 text-sm font-medium">Open →</span>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        )}
      </PageContainer>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchProjects}
      />
    </>
  );
};
