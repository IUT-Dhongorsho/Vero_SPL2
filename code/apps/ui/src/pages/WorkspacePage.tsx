import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const { projectId, workspaceId } = useParams<{ projectId: string; workspaceId: string }>();
  const navigate = useNavigate();
  
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
    { icon: '📁', label: 'Projects', href: '/projects' },
    { icon: '✅', label: 'My Tasks', href: '/tasks' },
    { icon: '📅', label: 'Calendar', href: '/calendar' },
    { icon: '📄', label: 'Files', href: '/files' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleNewCard = () => {
    alert('Create new card modal would open here');
  };

  const workspaceNames: Record<string, string> = {
    '1': 'Design System',
    '2': 'Backend API',
    '3': 'Frontend Development',
  };
  
  const workspaceName = workspaceNames[workspaceId || '3'] || 'Selected Workspace';

  return (
    <PageContainer
      title={workspaceName}
      sidebarItems={sidebarItems}
      topBarActions={
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(`/project/${projectId}`)}>
            ← Back to Project
          </Button>
          <Button variant="outline" size="sm">🎥 Start Meet</Button>
          <Button variant="outline" size="sm">👥 Invite</Button>
          <Button variant="primary" size="sm" onClick={handleNewCard}>
            + Add Card
          </Button>
        </div>
      }
    >
      {/* Workspace Header */}
      <div className="bg-blue-50 rounded-xl p-6 mb-8 border border-gray-200">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{workspaceName}</h1>
            <p className="text-gray-500">
              Build React components and pages for Vero platform
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">🎥 Start Meet</Button>
            <Button variant="outline" size="sm">👥 Invite</Button>
          </div>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* To Do Column */}
        <div>
          <div className="bg-gray-100 rounded-lg p-4 mb-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900">
              📥 To Do ({cards.filter(c => c.status === 'todo').length})
            </h3>
          </div>
          <div className="space-y-3">
            {cards.filter(c => c.status === 'todo').map((card) => (
              <Card key={card.id} variant="default" padding="md">
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full text-white ${getPriorityColor(card.priority)}`}>
                      {card.priority.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">⏱️ {card.dueDate}</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{card.title}</h4>
                  <p className="text-xs text-gray-500 mb-3">{card.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">👤 {card.assignee}</span>
                    <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors">
                      Start
                    </button>
                  </div>
                </div>
              </Card>
            ))}
            <button
              onClick={handleNewCard}
              className="w-full py-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-gray-500 text-sm hover:bg-gray-100 transition-colors"
            >
              + Add Task
            </button>
          </div>
        </div>

        {/* In Progress Column */}
        <div>
          <div className="bg-gray-100 rounded-lg p-4 mb-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900">
              🔄 In Progress ({cards.filter(c => c.status === 'in-progress').length})
            </h3>
          </div>
          <div className="space-y-3">
            {cards.filter(c => c.status === 'in-progress').map((card) => (
              <Card key={card.id} variant="default" padding="md">
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full text-white ${getPriorityColor(card.priority)}`}>
                      {card.priority.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">{card.dueDate}</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{card.title}</h4>
                  <p className="text-xs text-gray-500 mb-3">{card.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">👤 {card.assignee}</span>
                    <button className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors">
                      ✓ Done
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Done Column */}
        <div>
          <div className="bg-gray-100 rounded-lg p-4 mb-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900">
              ✅ Done ({cards.filter(c => c.status === 'done').length})
            </h3>
          </div>
          <div className="bg-gray-50 rounded-lg p-12 text-center border border-gray-200">
            <span className="text-5xl">🎉</span>
            <p className="text-gray-500 mt-3">No completed tasks yet</p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
