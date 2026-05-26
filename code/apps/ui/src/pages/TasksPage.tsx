import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Filter, Calendar as CalendarIcon, Flag } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { EmptyState } from '../components/ui/EmptyState';
import { mockTasks, Task } from '../data/mockData';
import { groupTasksByDueDate, formatDate } from '../utils/dateUtils';

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showFilter, setShowFilter] = useState(false);

  const sidebarItems = [
    { icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { icon: '📁', label: 'Projects', href: '/projects' },
    { icon: '✅', label: 'My Tasks', href: '/tasks', active: true },
    { icon: '📅', label: 'Calendar', href: '/calendar' },
    { icon: '📄', label: 'Files', href: '/files' },
  ];

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.priority === filter;
  });

  const groups = groupTasksByDueDate(filteredTasks);
  const hasTasks = filteredTasks.length > 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <Flag className="w-3 h-3" />;
      case 'medium': return <Flag className="w-3 h-3" />;
      default: return <Flag className="w-3 h-3" />;
    }
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, status: task.status === 'done' ? 'todo' : 'done' }
        : task
    ));
  };

  const TaskItem = ({ task }: { task: Task }) => (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      whileHover={{ scale: 1.01 }}
    >
      <GlassCard className="p-4 mb-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleTaskStatus(task.id)}
            className="mt-0.5"
          >
            {task.status === 'done' ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Circle className="w-5 h-5 text-gray-400 hover:text-blue-500 transition-colors" />
            )}
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className={`font-semibold ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>
                {task.title}
              </h4>
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                {getPriorityIcon(task.priority)}
                {task.priority.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{task.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                📁 {task.projectName}
              </span>
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                Due: {formatDate(new Date(task.dueDate))}
              </span>
              <span>👤 {task.assigneeName}</span>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );

  return (
    <PageContainer
      title="My Tasks"
      sidebarItems={sidebarItems}
      topBarActions={
        <div className="flex gap-3 items-center">
          <div className="relative">
            <AnimatedButton
              variant="outline"
              size="sm"
              onClick={() => setShowFilter(!showFilter)}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filter
            </AnimatedButton>
            <AnimatePresence>
              {showFilter && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-36 glass rounded-lg shadow-lg overflow-hidden z-10"
                >
                  {['all', 'high', 'medium', 'low'].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => {
                        setFilter(priority as any);
                        setShowFilter(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-white/20 transition-colors ${filter === priority ? 'text-blue-500' : ''}`}
                    >
                      {priority === 'all' ? 'All Tasks' : `${priority.toUpperCase()} Priority`}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <ThemeToggle />
        </div>
      }
    >
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Your Tasks</h2>
          <p className="text-gray-500 dark:text-gray-400">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} assigned to you
          </p>
        </div>

        {!hasTasks ? (
          <EmptyState type="tasks" />
        ) : (
          <>
            {groups.today.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="text-red-500">📅</span> Due Today ({groups.today.length})
                </h3>
                {groups.today.map((task: Task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}

            {groups.tomorrow.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="text-yellow-500">📅</span> Due Tomorrow ({groups.tomorrow.length})
                </h3>
                {groups.tomorrow.map((task: Task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}

            {groups.thisWeek.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="text-blue-500">📅</span> This Week ({groups.thisWeek.length})
                </h3>
                {groups.thisWeek.map((task: Task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}

            {groups.later.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="text-gray-500">📅</span> Later ({groups.later.length})
                </h3>
                {groups.later.map((task: Task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
};
