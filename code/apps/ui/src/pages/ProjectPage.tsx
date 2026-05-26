import React, { useState } from 'react';
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
    { icon: '��', label: 'Projects', href: '/projects', active: true },
    { icon: '✅', label: 'My Tasks', href: '/tasks' },
    { icon: '📅', label: 'Calendar', href: '/calendar' },
    { icon: '📄', label: 'Files', href: '/files' },
  ];

  const handleNewWorkspace = () => {
    alert('Create new workspace modal would open here');
  };

  return (
    <PageContainer
      title="SPL-II Development"
      sidebarItems={sidebarItems}
      activeSidebarItem="/projects"
      topBarActions={
        <div style={{ display: 'flex', gap: '12px' }}>
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
      <div
        className="glass"
        style={{
          padding: '24px',
          borderRadius: 'var(--radius-xl)',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>SPL-II Development</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Building Vero - Unified productivity platform
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span>👥 9 members</span>
            <span>📊 35% complete</span>
          </div>
        </div>
        <div
          style={{
            marginTop: '20px',
            height: '8px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '35%',
              height: '100%',
              backgroundColor: 'var(--primary)',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <Button variant="primary">✏️ New Note</Button>
        <Button variant="outline">📋 New Task</Button>
        <Button variant="outline">🎥 Start Meet</Button>
      </div>

      {/* Workspaces Grid */}
      <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Workspaces</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '24px',
        }}
      >
        {workspaces.map((workspace) => (
          <Card
            key={workspace.id}
            title={workspace.name}
            subtitle={workspace.description}
            variant="glass"
            onClick={() => console.log('Navigate to workspace:', workspace.id)}
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
              <div style={{ display: 'flex', gap: '16px' }}>
                <span>📋 {workspace.cardCount} cards</span>
                <span>👥 {workspace.members} members</span>
              </div>
              <span style={{ color: 'var(--primary)' }}>→</span>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
};
