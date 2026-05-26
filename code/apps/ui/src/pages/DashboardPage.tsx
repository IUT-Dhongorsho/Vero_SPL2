import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/Layout/PageContainer';
import { Card } from '../components/Common/Card';
import { Button } from '../components/Common/Button';

interface Project {
  id: string;
  name: string;
  description: string;
  members: number;
  lastActive: string;
  status: 'active' | 'review' | 'completed';
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects] = useState<Project[]>([
    {
      id: '1',
      name: 'Global Rebrand',
      description: 'Marketing site overhaul and new brand identity',
      members: 4,
      lastActive: '2 hours ago',
      status: 'active',
    },
    {
      id: '2',
      name: 'Q3 Product Launch',
      description: 'Feature planning and go-to-market strategy',
      members: 6,
      lastActive: 'Yesterday',
      status: 'active',
    },
    {
      id: '3',
      name: 'SPL-II Development',
      description: 'Building Vero - Unified productivity platform',
      members: 3,
      lastActive: 'Just now',
      status: 'active',
    },
    {
      id: '4',
      name: 'User Research Q4',
      description: 'Customer interviews and data analysis',
      members: 3,
      lastActive: '3 days ago',
      status: 'review',
    },
  ]);

  const sidebarItems = [
    { icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { icon: '��', label: 'Projects', href: '/projects' },
    { icon: '✅', label: 'My Tasks', href: '/tasks' },
    { icon: '📅', label: 'Calendar', href: '/calendar' },
    { icon: '📄', label: 'Files', href: '/files' },
  ];

  const handleNewProject = () => {
    alert('Create new project modal would open here');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'review': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <PageContainer
      title="Dashboard"
      sidebarItems={sidebarItems}
      topBarActions={
        <Button variant="primary" size="sm" onClick={handleNewProject}>
          + New Project
        </Button>
      }
    >
      {/* Welcome Section */}
      <div className="bg-blue-50 rounded-xl p-8 mb-8 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, Jane! 👋
        </h1>
        <p className="text-gray-500">
          You have {projects.length} active projects. Ready to collaborate?
        </p>
      </div>

      {/* Projects Grid */}
      <h2 className="text-xl font-semibold text-gray-900 mb-5">Your Projects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card
            key={project.id}
            title={project.name}
            subtitle={project.description}
            onClick={() => navigate(`/project/${project.id}`)}
          >
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
              <div className="flex gap-4">
                <span className="text-sm text-gray-500">👥 {project.members}</span>
                <span className="text-sm text-gray-500">🕐 {project.lastActive}</span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
};
