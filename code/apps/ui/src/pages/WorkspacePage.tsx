import React, { useState } from 'react';
import { PageContainer } from '../components/Layout/PageContainer';
import { Card } from '../components/Common/Card';
import { Button } from '../components/Common/Button';

interface CardItem {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  dueDate: string;
}

export const WorkspacePage: React.FC = () => {
  const [cards] = useState<CardItem[]>([
    {
      id: '1',
      title: 'Finalize Q3 Marketing Campaign Assets',
      description: 'Review and approve all banner ads and social media graphics',
      status: 'todo',
      priority: 'high',
      assignee: 'Jane Doe',
      dueDate: 'Tomorrow',
    },
    {
      id: '2',
      title: 'Product Requirements Document v2.0',
      description: 'Update PRD with new features and API changes',
      status: 'todo',
      priority: 'medium',
      assignee: 'John Smith',
      dueDate: '2 days left',
    },
    {
      id: '3',
      title: 'Live Sync Implementation',
      description: 'Implement real-time sync for collaborative editing',
      status: 'in-progress',
      priority: 'high',
      assignee: 'Sarah Chen',
      dueDate: '65% complete',
    },
    {
      id: '4',
      title: 'User Authentication API',
      description: 'Implement backend API for user authentication',
      status: 'in-progress',
      priority: 'high',
      assignee: 'Mike Johnson',
      dueDate: 'Due Tomorrow',
    },
  ]);

  const sidebarItems = [
    { icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { icon: '📁', label: 'Projects', href: '/projects', active: true },
    { icon: '✅', label: 'My Tasks', href: '/tasks' },
    { icon: '📅', label: 'Calendar', href: '/calendar' },
    { icon: '📄', label: 'Files', href: '/files' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'var(--danger)';
      case 'medium': return 'var(--warning)';
      case 'low': return 'var(--secondary)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'var(--info)';
      case 'in-progress': return 'var(--warning)';
      case 'done': return 'var(--secondary)';
      default: return 'var(--text-secondary)';
    }
  };

  const handleNewCard = () => {
    alert('Create new card modal would open here');
  };

  return (
    <PageContainer
      title="Frontend Development"
      sidebarItems={sidebarItems}
      activeSidebarItem="/projects"
      topBarActions={
        <Button variant="primary" size="sm" onClick={handleNewCard}>
          + Add Card
        </Button>
      }
    >
      {/* Workspace Header */}
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
            <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Frontend Development</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Build React components and pages for Vero platform
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="outline" size="sm">🎥 Start Meet</Button>
            <Button variant="outline" size="sm">👥 Invite</Button>
          </div>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
        }}
      >
        {/* To Do Column */}
        <div>
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
              📥 To Do ({cards.filter(c => c.status === 'todo').length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cards.filter(c => c.status === 'todo').map((card) => (
              <Card key={card.id} variant="glass" padding="md">
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: getPriorityColor(card.priority),
                        color: 'white',
                      }}
                    >
                      {card.priority.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      ⏱️ {card.dueDate}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                    {card.title}
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    {card.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px' }}>👤 {card.assignee}</span>
                    <button
                      style={{
                        padding: '4px 12px',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Start
                    </button>
                  </div>
                </div>
              </Card>
            ))}
            <button
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
              onClick={handleNewCard}
            >
              + Add Task
            </button>
          </div>
        </div>

        {/* In Progress Column */}
        <div>
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
              🔄 In Progress ({cards.filter(c => c.status === 'in-progress').length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cards.filter(c => c.status === 'in-progress').map((card) => (
              <Card key={card.id} variant="glass" padding="md">
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: getPriorityColor(card.priority),
                        color: 'white',
                      }}
                    >
                      {card.priority.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {card.dueDate}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                    {card.title}
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    {card.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px' }}>👤 {card.assignee}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        style={{
                          padding: '4px 12px',
                          backgroundColor: 'var(--secondary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        ✓ Done
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Done Column */}
        <div>
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
              ✅ Done ({cards.filter(c => c.status === 'done').length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <span style={{ fontSize: '48px' }}>🎉</span>
              <p>No completed tasks yet</p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
