import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Video, Users, MoreVertical, CheckCircle, Circle } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { GlassCard } from '../components/ui/GlassCard';
import { ThemeToggle } from '../components/ui/ThemeToggle';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  assignee: string;
}

export const WorkspacePage: React.FC = () => {
  const { projectId, workspaceId } = useParams();
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Finalize Q3 Marketing Assets', description: 'Review and approve all banner ads', status: 'todo', priority: 'high', assignee: 'Jane' },
    { id: '2', title: 'Product Requirements v2.0', description: 'Update PRD with new features', status: 'todo', priority: 'medium', assignee: 'John' },
    { id: '3', title: 'Live Sync Implementation', description: 'Real-time sync for editing', status: 'progress', priority: 'high', assignee: 'Sarah' },
    { id: '4', title: 'User Authentication API', description: 'Implement backend auth', status: 'progress', priority: 'high', assignee: 'Mike' },
  ]);

  const sidebarItems = [
    { icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { icon: '📁', label: 'Projects', href: '/projects' },
    { icon: '✅', label: 'My Tasks', href: '/tasks' },
    { icon: '📅', label: 'Calendar', href: '/calendar' },
    { icon: '📄', label: 'Files', href: '/files' },
  ];

  const columns = [
    { id: 'todo', title: 'To Do', icon: <Circle className="w-4 h-4" />, tasks: tasks.filter(t => t.status === 'todo') },
    { id: 'progress', title: 'In Progress', icon: <div className="w-4 h-4 rounded-full border-2 border-yellow-500" />, tasks: tasks.filter(t => t.status === 'progress') },
    { id: 'done', title: 'Done', icon: <CheckCircle className="w-4 h-4 text-green-500" />, tasks: tasks.filter(t => t.status === 'done') },
  ];

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        if (task.status === 'todo') return { ...task, status: 'progress' };
        if (task.status === 'progress') return { ...task, status: 'done' };
        return { ...task, status: 'todo' };
      }
      return task;
    }));
  };

  return (
    <PageContainer
      title="Frontend Development"
      sidebarItems={sidebarItems}
      topBarActions={
        <div className="flex gap-3 items-center">
          <AnimatedButton variant="outline" size="sm" onClick={() => navigate(`/project/${projectId}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </AnimatedButton>
          <AnimatedButton variant="outline" size="sm">
            <Video className="w-4 h-4 mr-1" />
            Start Meet
          </AnimatedButton>
          <AnimatedButton variant="outline" size="sm">
            <Users className="w-4 h-4 mr-1" />
            Invite
          </AnimatedButton>
          <AnimatedButton variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Card
          </AnimatedButton>
          <ThemeToggle />
        </div>
      }
    >
      {/* Workspace Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-6 mb-8 border border-blue-200 dark:border-blue-800"
      >
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Frontend Development</h1>
            <p className="text-gray-600 dark:text-gray-400">Build React components and pages for Vero platform</p>
          </div>
          <div className="flex gap-2">
            <AnimatedButton variant="outline" size="sm"><Video className="w-4 h-4 mr-1" /> Start Meet</AnimatedButton>
            <AnimatedButton variant="outline" size="sm"><Users className="w-4 h-4 mr-1" /> Invite</AnimatedButton>
          </div>
        </div>
      </motion.div>

      {/* Kanban Columns */}
      <div className="grid md:grid-cols-3 gap-6">
        {columns.map((column, colIndex) => (
          <motion.div
            key={column.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: colIndex * 0.1 }}
          >
            <div className="bg-gray-100/50 dark:bg-gray-900/50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                {column.icon} {column.title} ({column.tasks.length})
              </h3>
              <div className="space-y-3">
                {column.tasks.map((task, taskIndex) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: colIndex * 0.1 + taskIndex * 0.05 }}
                  >
                    <GlassCard className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>
                        <button onClick={() => toggleTaskStatus(task.id)}>
                          {task.status === 'done' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : task.status === 'progress' ? (
                            <div className="w-4 h-4 rounded-full border-2 border-yellow-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{task.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{task.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-500">👤 {task.assignee}</span>
                        <AnimatedButton variant="primary" size="sm">Start</AnimatedButton>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
                <button className="w-full py-3 text-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                  + Add Task
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </PageContainer>
  );
};
