import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Users, FolderKanban, Video, Edit3, ClipboardList } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { GlassCard } from '../components/ui/GlassCard';
import { ThemeToggle } from '../components/ui/ThemeToggle';

interface Workspace {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  members: number;
}

export const ProjectPage: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [workspaces] = useState<Workspace[]>([
    { id: '1', name: 'Design System', description: 'Reusable UI components', cardCount: 12, members: 3 },
    { id: '2', name: 'Backend API', description: 'RESTful APIs', cardCount: 8, members: 2 },
    { id: '3', name: 'Frontend Development', description: 'React components', cardCount: 15, members: 4 },
  ]);

  const sidebarItems = [
    { icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { icon: '📁', label: 'Projects', href: '/projects' },
    { icon: '✅', label: 'My Tasks', href: '/tasks' },
    { icon: '📅', label: 'Calendar', href: '/calendar' },
    { icon: '📄', label: 'Files', href: '/files' },
  ];

  const projectNames: Record<string, string> = {
    '1': 'Global Rebrand',
    '2': 'Q3 Product Launch',
    '3': 'SPL-II Development',
  };
  const projectName = projectNames[projectId || '3'] || 'Project';

  return (
    <PageContainer
      title={projectName}
      sidebarItems={sidebarItems}
      topBarActions={
        <div className="flex gap-3 items-center">
          <AnimatedButton variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </AnimatedButton>
          <AnimatedButton variant="outline" size="sm">
            <Users className="w-4 h-4 mr-1" />
            Invite
          </AnimatedButton>
          <AnimatedButton variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New Workspace
          </AnimatedButton>
          <ThemeToggle />
        </div>
      }
    >
      {/* Project Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-6 mb-8 border border-blue-200 dark:border-blue-800"
      >
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{projectName}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Building Vero - Unified productivity platform
            </p>
          </div>
          <div className="flex gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1"><Users className="w-4 h-4" /> 9 members</span>
            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1"><FolderKanban className="w-4 h-4" /> 35% complete</span>
          </div>
        </div>
        <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="w-[35%] h-full bg-blue-600 rounded-full"></div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="flex gap-4 mb-8">
        <AnimatedButton variant="primary" onClick={() => navigate(`/project/${projectId}/notes`)}>
          <Edit3 className="w-4 h-4 mr-2" />
          New Note
        </AnimatedButton>
        <AnimatedButton variant="outline">
          <ClipboardList className="w-4 h-4 mr-2" />
          New Task
        </AnimatedButton>
        <AnimatedButton variant="outline">
          <Video className="w-4 h-4 mr-2" />
          Start Meet
        </AnimatedButton>
      </div>

      {/* Workspaces Grid */}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Workspaces</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((workspace, index) => (
          <motion.div
            key={workspace.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GlassCard onClick={() => navigate(`/project/${projectId}/workspace/${workspace.id}`)}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{workspace.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{workspace.description}</p>
              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-3 text-sm text-gray-500 dark:text-gray-500">
                  <span>📋 {workspace.cardCount} cards</span>
                  <span>👥 {workspace.members} members</span>
                </div>
                <span className="text-blue-600">→</span>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </PageContainer>
  );
};
