import React, { useState } from 'react';
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
      name: 'User Research Q4',
      description: 'Customer interviews and data analysis',
      members: 3,
      lastActive: '3 days ago',
      status: 'review',
    },
  ]);

  const sidebarItems = [
    { icon: '📊', label: 'Dashboard', href: '/dashboard', active: true },
    { icon: '📁', label: 'Projects', href: '/projects' },
    { icon: '✅', label: 'My Tasks', href: '/tasks' },
    { icon: '📅', label: 'Calendar', href: '/calendar' },
    { icon: '��', label: 'Files', href: '/files' },
  ];

  const handleNewProject = () => {
    alert('Create new project modal would open here');
  };

  return (
    <PageContainer
      title="Dashboard"
      sidebarItems={sidebarItems}
      activeSidebarItem="/dashboard"
      topBarActions={
        <Button variant="primary" size="sm" onClick={handleNewProject}>
          + New Project
        </Button>
      }
    >
      {/* Welcome Section */}
      <div
        className="glass"
        style={{
          padding: '32px',
          borderRadius: 'var(--radius-xl)',
          marginBottom: '32px',
        }}
      >
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>
          Welcome back, Jane! 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          You have {projects.length} active projects. Ready to collaborate?
        </p>
      </div>

      {/* Projects Grid */}
      <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Your Projects</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '24px',
        }}
      >
        {projects.map((project) => (
          <Card
            key={project.id}
            title={project.name}
            subtitle={project.description}
            variant="glass"
            onClick={() => console.log('Navigate to project:', project.id)}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>👥 {project.members}</span>
                <span>🕐 {project.lastActive}</span>
              </div>
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  backgroundColor:
                    project.status === 'active'
                      ? 'var(--secondary)'
                      : project.status === 'review'
                      ? 'var(--warning)'
                      : 'var(--info)',
                  color: 'white',
                }}
              >
                {project.status}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
};
