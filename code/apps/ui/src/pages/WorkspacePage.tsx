import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Video, Users, MoreVertical } from 'lucide-react';
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
  
  const [tasks] = useState<Task[]>([
    { id: '1', title: 'Finalize Q3 Marketing Assets', description: 'Review and approve all banner ads', status: 'todo', priority: 'high', assignee: 'Jane' },
    { id: '2', title: 'Product Requirements v2.0', description: 'Update PRD with new features', status: 'todo', priority: 'medium', assignee: 'John' },
    { id: '3', title: 'Live Sync Implementation', description: 'Real-time sync for editing', status: 'progress', priority: 'high', assignee: 'Sarah' },
    { id: '4', title: 'User Authentication API', description: 'Implement backend auth', status: 'progress', priority: 'high', assignee: 'Mike' },
  ]);

  const columns = [
    { id: 'todo', title: '📥 To Do', color: 'text-blue-600', tasks: tasks.filter(t => t.status === 'todo') },
    { id: 'progress', title: '🔄 In Progress', color: 'text-yellow-600', tasks: tasks.filter(t => t.status === 'progress') },
    { id: 'done', title: '✅ Done', color: 'text-green-600', tasks: tasks.filter(t => t.status === 'done') },
  ];

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top Bar */}
      <div className="fixed top-0 right-0 left-0 z-50 glass border-b border-gray-200/20">
        <div className="px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <AnimatedButton variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}`)}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </AnimatedButton>
            <h1 className="text-xl font-semibold">Frontend Development</h1>
          </div>
          <div className="flex gap-3 items-center">
            <ThemeToggle />
            <AnimatedButton variant="outline" size="sm">
              <Video className="w-4 h-4 mr-1" />
              Start Meet
            </AnimatedButton>
            <AnimatedButton variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Card
            </AnimatedButton>
          </div>
        </div>
      </div>

      {/* Main Content - Kanban Board */}
      <main className="pt-24 px-8 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">Frontend Development</h2>
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
                <h3 className={`font-semibold mb-4 ${column.color}`}>{column.title} ({column.tasks.length})</h3>
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
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </div>
                        <h4 className="font-semibold mb-1">{task.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{task.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">👤 {task.assignee}</span>
                          <AnimatedButton variant="primary" size="sm">Start</AnimatedButton>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                  <button className="w-full py-3 text-center text-gray-500 hover:text-blue-600 transition-colors border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                    + Add Task
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};
