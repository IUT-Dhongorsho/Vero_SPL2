import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Users, FolderKanban, Video, ClipboardList, Edit3, LayoutDashboard, CheckSquare, CalendarDays, Files } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { GlassCard } from '../components/ui/GlassCard';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { CreateWorkspaceModal } from '../components/modals/CreateWorkspaceModal';
import { workspaceService } from '../services/workspaceService';

interface Workspace {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  members: number;
  projectId: string;
}

export const ProjectPage: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchWorkspaces = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await workspaceService.getWorkspaces(projectId);
      setWorkspaces(data);
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [projectId]);

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', href: '/dashboard' },
    { icon: <FolderKanban className="w-4 h-4" />, label: 'Projects', href: '/projects' },
    { icon: <CheckSquare className="w-4 h-4" />, label: 'My Tasks', href: '/tasks' },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'Calendar', href: '/calendar' },
    { icon: <Files className="w-4 h-4" />, label: 'Files', href: '/files' },
  ];

  const projectNames: Record<string, string> = {
    '1': 'Global Rebrand',
    '2': 'Q3 Product Launch',
    '3': 'SPL-II Development',
  };
  const projectName = projectNames[projectId || '3'] || 'Project';

  if (loading) {
    return (
      <PageContainer title={projectName} sidebarItems={sidebarItems}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </PageContainer>
    );
  }

  return (
    <>
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
            <AnimatedButton variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              New Workspace
            </AnimatedButton>
            <ThemeToggle />
          </div>
        }
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-6 mb-8 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{projectName}</h1>
              <p className="text-gray-600 dark:text-gray-400">Building Vero - Unified productivity platform</p>
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

        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Workspaces</h3>
        {workspaces.length === 0 ? (
          <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl">
            <FolderKanban className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No workspaces yet. Create your first workspace!</p>
            <AnimatedButton variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Create Workspace
            </AnimatedButton>
          </div>
        ) : (
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
        )}
      </PageContainer>

      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchWorkspaces}
        projectId={projectId || '3'}
      />
    </>
  );
};
