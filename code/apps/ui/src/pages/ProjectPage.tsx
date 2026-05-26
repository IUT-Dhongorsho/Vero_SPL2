import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/Layout/PageContainer';
import { Card } from '../components/Common/Card';
import { Button } from '../components/Common/Button';

interface Workspace {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  members: number;
}

export const ProjectPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [workspaces] = useState<Workspace[]>([
    {
      id: '1',
      name: 'Design System',
      description: 'Create and maintain reusable UI components',
      cardCount: 12,
      members: 3,
    },
    {
      id: '2',
      name: 'Backend API',
      description: 'Develop RESTful APIs for Vero platform',
      cardCount: 8,
      members: 2,
    },
    {
      id: '3',
      name: 'Frontend Development',
      description: 'Build React components and pages',
      cardCount: 15,
      members: 4,
    },
  ]);

  const sidebarItems = [
    { icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { icon: '📁', label: 'Projects', href: '/projects' },
    { icon: '✅', label: 'My Tasks', href: '/tasks' },
    { icon: '📅', label: 'Calendar', href: '/calendar' },
    { icon: '📄', label: 'Files', href: '/files' },
  ];

  const handleNewWorkspace = () => {
    alert('Create new workspace modal would open here');
  };

  const projectNames: Record<string, string> = {
    '1': 'Global Rebrand',
    '2': 'Q3 Product Launch',
    '3': 'SPL-II Development',
    '4': 'User Research Q4',
  };
  
  const projectName = projectNames[projectId || '3'] || 'Selected Project';

  return (
    <PageContainer
      title={projectName}
      sidebarItems={sidebarItems}
      topBarActions={
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            ← Back
          </Button>
          <Button variant="outline" size="sm">
            Invite
          </Button>
          <Button variant="primary" size="sm" onClick={handleNewWorkspace}>
            + New Workspace
          </Button>
        </div>
      }
    >
      {/* Project Header */}
      <div className="bg-blue-50 rounded-xl p-6 mb-8 border border-gray-200">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{projectName}</h1>
            <p className="text-gray-500">
              Building Vero - Unified productivity platform
            </p>
          </div>
          <div className="flex gap-4">
            <span className="text-sm text-gray-500">👥 9 members</span>
            <span className="text-sm text-gray-500">📊 35% complete</span>
          </div>
        </div>
        <div className="mt-5 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="w-[35%] h-full bg-blue-600 rounded-full"></div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 mb-8">
        <Button variant="primary">✏️ New Note</Button>
        <Button variant="outline">📋 New Task</Button>
        <Button variant="outline">🎥 Start Meet</Button>
      </div>

      {/* Workspaces Grid */}
      <h2 className="text-xl font-semibold text-gray-900 mb-5">Workspaces</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((workspace) => (
          <Card
            key={workspace.id}
            title={workspace.name}
            subtitle={workspace.description}
            onClick={() => navigate(`/project/${projectId}/workspace/${workspace.id}`)}
          >
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
              <div className="flex gap-4">
                <span className="text-sm text-gray-500">📋 {workspace.cardCount} cards</span>
                <span className="text-sm text-gray-500">👥 {workspace.members} members</span>
              </div>
              <span className="text-blue-600 text-lg">→</span>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
};
