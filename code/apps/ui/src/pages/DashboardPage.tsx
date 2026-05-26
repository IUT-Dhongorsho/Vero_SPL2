import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users, Clock, FolderOpen, LayoutDashboard, FolderKanban, CheckSquare, CalendarDays, Files } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { GlassCard } from '../components/ui/GlassCard';
import { ThemeToggle } from '../components/ui/ThemeToggle';

interface Project {
  id: string;
  name: string;
  description: string;
  members: number;
  lastActive: string;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects] = useState<Project[]>([
    { id: '1', name: 'Global Rebrand', description: 'Marketing site overhaul', members: 4, lastActive: '2 hours ago' },
    { id: '2', name: 'Q3 Product Launch', description: 'Feature planning', members: 6, lastActive: 'Yesterday' },
    { id: '3', name: 'SPL-II Development', description: 'Building Vero platform', members: 3, lastActive: 'Just now' },
  ]);

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', href: '/dashboard' },
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

  return (
    <PageContainer
      title="Dashboard"
      sidebarItems={sidebarItems}
      topBarActions={
        <div className="flex gap-3 items-center">
          <AnimatedButton variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New Project
          </AnimatedButton>
          <ThemeToggle />
        </div>
      }
    >
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-8 mb-8 border border-blue-200 dark:border-blue-800"
      >
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome back, Jane! 🎉</h2>
        <p className="text-gray-600 dark:text-gray-300">
          You have {projects.length} active projects. Ready to collaborate?
        </p>
      </motion.div>

      {/* Projects Grid */}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-5">Your Projects</h3>
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
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{project.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {project.description}
              </p>
              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-3 text-sm">
                  <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400"><Users className="w-3 h-3" /> {project.members}</span>
                  <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400"><Clock className="w-3 h-3" /> {project.lastActive}</span>
                </div>
                <span className="text-blue-600 text-sm font-medium">Open →</span>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </PageContainer>
  );
};
