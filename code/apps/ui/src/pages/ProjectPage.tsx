import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Users, FolderKanban, Video } from 'lucide-react';
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

  const projectNames: Record<string, string> = {
    '1': 'Global Rebrand',
    '2': 'Q3 Product Launch',
    '3': 'SPL-II Development',
  };
  const projectName = projectNames[projectId || '3'] || 'Project';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top Bar */}
      <div className="fixed top-0 right-0 left-0 z-50 glass border-b border-gray-200/20">
        <div className="px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <AnimatedButton variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </AnimatedButton>
            <h1 className="text-xl font-semibold">{projectName}</h1>
          </div>
          <div className="flex gap-3 items-center">
            <ThemeToggle />
            <AnimatedButton variant="outline" size="sm">
              <Video className="w-4 h-4 mr-1" />
              Meet
            </AnimatedButton>
            <AnimatedButton variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New Workspace
            </AnimatedButton>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-24 px-8 pb-8">
        {/* Project Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-8"
        >
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">{projectName}</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Building Vero - Unified productivity platform
              </p>
            </div>
            <div className="flex gap-4">
              <span className="flex items-center gap-2 text-gray-500"><Users className="w-4 h-4" /> 9 members</span>
              <span className="flex items-center gap-2 text-gray-500"><FolderKanban className="w-4 h-4" /> 35% complete</span>
            </div>
          </div>
          <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="w-[35%] h-full bg-blue-600 rounded-full"></div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <div className="flex gap-4 mb-8">
          <AnimatedButton variant="primary">✏️ New Note</AnimatedButton>
          <AnimatedButton variant="outline">📋 New Task</AnimatedButton>
          <AnimatedButton variant="outline">🎥 Start Meet</AnimatedButton>
        </div>

        {/* Workspaces Grid */}
        <h3 className="text-xl font-semibold mb-4">Workspaces</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace, index) => (
            <motion.div
              key={workspace.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard onClick={() => navigate(`/project/${projectId}/workspace/${workspace.id}`)}>
                <h3 className="text-lg font-semibold mb-1">{workspace.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{workspace.description}</p>
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-3 text-sm text-gray-500">
                    <span>📋 {workspace.cardCount} cards</span>
                    <span>👥 {workspace.members} members</span>
                  </div>
                  <span className="text-blue-600">→</span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};
